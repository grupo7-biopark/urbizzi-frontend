import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeUsuario } from '@/test/factories/usuario.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import type { ReservaResumo } from '../api/reservas-consulta.api';
import { reservasSearchSchema } from '../schemas/reservas-search.schema';
import { ReservasTable } from './reservas-table';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const META = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
const ID = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';
const RESERVA: ReservaResumo = {
  id: ID,
  vendedorId: makeUsuario().id,
  status: 'ATIVA',
  dataInicio: '2026-11-09T12:00:00Z',
  dataVencimento: '2026-11-16T12:00:00Z',
  cliente: { id: ID, nome: 'Cliente da reserva' },
  lote: {
    id: ID,
    numero: '12',
    quadra: 'A',
    loteamentoId: ID,
    loteamento: 'Jardim',
  },
  propostaAtual: { id: ID, status: 'EM_ANALISE', valor: '200000.00' },
};

beforeEach(() => {
  setTestUrl('/reservas');
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json(makeUsuario()),
    ),
    http.get('/v1/loteamentos', ({ response }) =>
      response(200).json({
        data: [],
        meta: { ...META, total: 0, totalPages: 0 },
      }),
    ),
  );
});

describe('ReservasTable', () => {
  it('usa /minhas para Comercial e apresenta os dados, prazo e ação própria', async () => {
    server.use(
      http.get('/v1/reservas/minhas', ({ response }) =>
        response(200).json({ data: [RESERVA], meta: META }),
      ),
    );
    const { container } = renderWithQuery(
      <ReservasTable
        search={reservasSearchSchema.parse({ vendedorId: ID })}
        verTodas={false}
        renderAcoes={() => <button>Renovar</button>}
      />,
    );
    expect(await screen.findByText('Cliente da reserva')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lote 12/ })).toHaveAttribute(
      'href',
      `/lotes/${ID}`,
    );
    expect(screen.getByText('Em análise')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Renovar' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Visão das reservas' }),
    ).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
  it('lista todas para o gestor, com filtro por identificador de vendedor', async () => {
    server.use(
      http.get('/v1/reservas', ({ response }) =>
        response(200).json({ data: [RESERVA], meta: META }),
      ),
    );
    renderWithQuery(
      <ReservasTable search={reservasSearchSchema.parse({})} verTodas />,
    );
    expect(await screen.findByText('Cliente da reserva')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Todas as reservas' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByLabelText('Identificador do vendedor'),
    ).toBeInTheDocument();
    const usuario = userEvent.setup();
    await usuario.type(
      screen.getByLabelText('Identificador do vendedor'),
      'invalido',
    );
    await usuario.click(
      screen.getByRole('button', { name: 'Aplicar filtros' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'identificador válido',
    );
    await usuario.clear(screen.getByLabelText('Identificador do vendedor'));
    await usuario.type(screen.getByLabelText('Identificador do vendedor'), ID);
    await usuario.click(
      screen.getByRole('button', { name: 'Aplicar filtros' }),
    );
    expect(window.location.search).toContain(`vendedorId=${ID}`);
  });
  it('não oferece ação de alteração para outro vendedor', async () => {
    server.use(
      http.get('/v1/reservas', ({ response }) =>
        response(200).json({
          data: [{ ...RESERVA, vendedorId: ID }],
          meta: META,
        }),
      ),
    );
    renderWithQuery(
      <ReservasTable
        search={reservasSearchSchema.parse({})}
        verTodas
        renderAcoes={() => <button>Renovar</button>}
      />,
    );
    expect(await screen.findByText('Cliente da reserva')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Renovar' }),
    ).not.toBeInTheDocument();
  });
  it('mostra vazio e permite tentar novamente após falha de rede', async () => {
    server.use(
      http.get('/v1/reservas/minhas', () => {
        throw new Error('indisponível');
      }),
    );
    renderWithQuery(
      <ReservasTable
        search={reservasSearchSchema.parse({})}
        verTodas={false}
      />,
    );
    const tentar = await screen.findByRole('button', {
      name: /Tentar novamente/i,
    });
    server.use(
      http.get('/v1/reservas/minhas', ({ response }) =>
        response(200).json({
          data: [],
          meta: { ...META, total: 0, totalPages: 0 },
        }),
      ),
    );
    await userEvent.click(tentar);
    expect(
      await screen.findByText('Nenhuma reserva encontrada'),
    ).toBeInTheDocument();
  });
  it('recusa período invertido antes de consultar a lista', async () => {
    renderWithQuery(
      <ReservasTable
        search={reservasSearchSchema.parse({
          vencimentoDe: '2026-11-10',
          vencimentoAte: '2026-11-09',
        })}
        verTodas
      />,
    );
    expect(
      within(screen.getByRole('alert')).getByText(/Ajuste o período/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
