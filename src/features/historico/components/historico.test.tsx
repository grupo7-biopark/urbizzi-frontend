import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { renderWithQuery } from '@/test/render';
import { setTestUrl } from '@/test/next-navigation';
import type { Historico } from '../api/historico.api';
import {
  historicoFiltrosSchema,
  historicoSearchSchema,
} from '../schemas/historico-search.schema';
import { AlteracoesHistorico } from './alteracoes-historico';
import { HistoricoLista } from './historico-lista';
vi.mock('next/navigation', () => import('@/test/next-navigation'));
const id = '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10';
const registro: Historico = {
  id,
  entidadeTipo: 'Lote',
  entidadeId: id,
  acao: 'ATUALIZAR',
  usuario: { id, nome: 'Pessoa fictícia' },
  createdAt: '2026-11-09T12:00:00Z',
  motivo: 'Correção autorizada',
  valorAnterior: { ativo: false, areaM2: '200.00', igual: 'igual' },
  valorNovo: { ativo: true, areaM2: '360.00', igual: 'igual' },
};
beforeEach(() => setTestUrl('/historico'));
describe('Histórico de auditoria', () => {
  it('formata diferenças, preserva mascaramento e texto seguro', () => {
    renderWithQuery(
      <AlteracoesHistorico
        registro={{
          ...registro,
          valorNovo: {
            ativo: true,
            areaM2: '360.00',
            documento: '***',
            observacoes: '<script>texto</script>',
            itens: [1, true],
            endereco: { cidade: 'Toledo' },
          },
        }}
      />,
    );
    expect(screen.getByText('Sim')).toBeVisible();
    expect(screen.getByText('Não')).toBeVisible();
    expect(screen.getByText('Área (m²)')).toBeVisible();
    expect(screen.getByText('***')).toBeVisible();
    expect(screen.getByText('<script>texto</script>')).toBeVisible();
    expect(screen.getByText('Correção autorizada')).toBeVisible();
  });
  it('lista, abre detalhes e não oferece edição', async () => {
    server.use(
      http.get('/v1/historico', ({ response }) =>
        response(200).json({
          data: [registro],
          meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        }),
      ),
    );
    renderWithQuery(
      <HistoricoLista search={historicoSearchSchema.parse({})} />,
    );
    expect(await screen.findByText('Pessoa fictícia')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Ver alteração' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('360,00 m²')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Excluir|Editar|Apagar/ }),
    ).not.toBeInTheDocument();
  });
  it('mantém filtros combinados na URL e valida período', async () => {
    server.use(
      http.get('/v1/historico', ({ response }) =>
        response(200).json({
          data: [],
          meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        }),
      ),
    );
    renderWithQuery(
      <HistoricoLista search={historicoSearchSchema.parse({})} />,
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Tipo de entidade'),
      'Lote',
    );
    await userEvent.type(screen.getByLabelText('ID da entidade'), id);
    await userEvent.type(screen.getByLabelText('ID do usuário'), id);
    await userEvent.click(
      screen.getByRole('button', { name: 'Aplicar filtros' }),
    );
    expect(new URLSearchParams(window.location.search).get('entidadeId')).toBe(
      id,
    );
    expect(new URLSearchParams(window.location.search).get('usuarioId')).toBe(
      id,
    );
  });
  it('tolera URL inválida mas rejeita filtros inválidos antes de enviar', () => {
    expect(
      historicoSearchSchema.parse({
        page: 'x',
        pageSize: '999',
        entidadeId: 'errado',
        dataDe: '2026-02-30',
      }),
    ).toMatchObject({
      page: 1,
      pageSize: 20,
      entidadeId: undefined,
      dataDe: undefined,
    });
    expect(
      historicoFiltrosSchema.safeParse({
        entidadeTipo: 'Lote',
        entidadeId: '',
        usuarioId: '',
        dataDe: '2026-11-10',
        dataAte: '2026-11-01',
      }).success,
    ).toBe(false);
  });
  it('mostra erro com nova tentativa e vazio depois da recuperação', async () => {
    server.use(
      http.untyped.get(
        '*/v1/historico',
        () =>
          new Response(
            JSON.stringify({ code: 'ACESSO_NEGADO', message: 'Acesso negado' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );
    renderWithQuery(
      <HistoricoLista search={historicoSearchSchema.parse({})} />,
    );
    expect(screen.getByLabelText('Carregando: Histórico')).toBeVisible();
    expect(await screen.findByRole('alert')).toBeVisible();
    server.use(
      http.get('/v1/historico', ({ response }) =>
        response(200).json({
          data: [],
          meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        }),
      ),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    );
    expect(
      await screen.findByText('Nenhuma alteração registrada'),
    ).toBeVisible();
  });
});
