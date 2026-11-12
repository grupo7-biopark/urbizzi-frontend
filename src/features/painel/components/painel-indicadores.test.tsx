import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { painelSearchSchema } from '../schemas/painel-search.schema';
import { PainelIndicadores } from './painel-indicadores';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const item = {
  total: 8,
  disponivel: 3,
  reservado: 2,
  vendido: 2,
  bloqueado: 1,
  porStatus: { DISPONIVEL: 3, RESERVADO: 2, VENDIDO: 2, BLOQUEADO: 1 },
};

describe('PainelIndicadores', () => {
  it('renderiza cartões e gráficos com as quantidades da API', async () => {
    setTestUrl('/');
    server.use(
      http.get('/v1/painel/resumo', ({ response }) =>
        response(200).json({ ...item, geral: item, porLoteamento: [] }),
      ),
      http.get('/v1/painel/vendas', ({ response }) =>
        response(200).json({
          total: 2,
          valorTotal: '300000.00',
          periodo: { dia: 0, semana: 0, mes: 2 },
          resumo: { dia: 0, semana: 0, mes: 2 },
          porDia: [],
          porSemana: [],
          porMes: [],
          porPeriodo: [
            { periodo: '2026-11', quantidade: 2, valorTotal: '300000.00' },
          ],
          porVendedor: [
            {
              vendedorId: 'v1',
              nome: 'Vendedora fictícia',
              quantidade: 2,
              valorTotal: '300000.00',
            },
          ],
        }),
      ),
      http.get('/v1/painel/pendencias', ({ response }) =>
        response(200).json({
          reservasAtivas: 2,
          reservasVencendoEmBreve: 1,
          propostasPendentes: 1,
          propostasAtrasadas: 0,
          total: 3,
          reservas: { ativas: 2, vencendoEmBreve: 1 },
          propostas: { pendentes: 1, atrasadas: 0, emDia: 1 },
        }),
      ),
    );
    renderWithQuery(
      <PainelIndicadores
        search={painelSearchSchema.parse({})}
        podeListar={false}
        minhas
      />,
    );
    const resumo = screen.getByRole('region', { name: 'Resumo de lotes' });
    expect(await within(resumo).findByText('8')).toBeVisible();
    const periodo = await screen.findByRole('list', {
      name: 'Vendas por período',
    });
    expect(within(periodo).getByText('2026-11')).toBeVisible();
    expect(
      within(
        screen.getByRole('list', { name: 'Vendas por vendedor' }),
      ).getByText('Vendedora fictícia'),
    ).toBeVisible();
    expect(
      await screen.findByText(/1 reservas vencendo em breve/),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Reservas vencendo em breve' }),
    ).not.toBeInTheDocument();
  });
});
