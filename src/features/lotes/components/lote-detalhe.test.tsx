import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { renderWithQuery } from '@/test/render';
import { makeLote } from '@/test/factories/lote.factory';
import type { components } from '@/shared/api/schema';
import { LoteDetalhe } from './lote-detalhe';
const lote = makeLote();
const detalhe: components['schemas']['LoteDetalheDto'] = {
  lote,
  loteamento: { id: lote.loteamentoId, nome: 'Bela Vista' },
  quadra: { id: lote.quadraId, numero: 'Q1' },
  reserva: null,
  propostas: [],
  historico: [],
};
function mock(dados = detalhe) {
  server.use(
    http.get('/v1/lotes/{id}/detalhe', ({ response }) =>
      response(200).json(dados),
    ),
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json({
        id: lote.id,
        nome: 'Consulta',
        email: 'consulta@exemplo.com',
        perfil: 'CONSULTA',
      }),
    ),
  );
}
describe('Detalhe completo do lote', () => {
  it.each(['DISPONIVEL', 'BLOQUEADO'] as const)(
    'mostra %s sem reserva nem dados pessoais',
    async (status) => {
      mock({ ...detalhe, lote: { ...lote, status } });
      renderWithQuery(<LoteDetalhe id={lote.id} />);
      expect(
        await screen.findByRole('heading', { name: 'Lote 12' }),
      ).toBeVisible();
      expect(
        screen.getByText('Nenhuma reserva disponível para consulta.'),
      ).toBeVisible();
      expect(
        screen.queryByRole('link', { name: 'Editar lote' }),
      ).not.toBeInTheDocument();
    },
  );
  it.each(['ATIVA', 'CONVERTIDA'] as const)(
    'mostra a reserva %s e propostas com decisão',
    async (status) => {
      mock({
        ...detalhe,
        reserva: {
          id: lote.id,
          status,
          cliente: { id: lote.id, nome: 'Cliente fictício' },
          vendedor: { id: lote.id, nome: 'Vendedor fictício' },
          dataInicio: '2026-11-01T12:00:00Z',
          dataVencimento: '2026-12-01T12:00:00Z',
        },
        propostas: [
          {
            id: lote.id,
            status: 'APROVADA',
            valor: '200000.00',
            dataEnvio: '2026-11-01T12:00:00Z',
            prazoLimite: '2026-11-03T12:00:00Z',
            dataDecisao: '2026-11-02T12:00:00Z',
          },
        ],
      });
      renderWithQuery(<LoteDetalhe id={lote.id} />);
      expect(await screen.findByText('Cliente fictício')).toBeVisible();
      expect(screen.getByText('Aprovada')).toBeVisible();
      expect(screen.getByText('Decidida em')).toBeVisible();
      if (status === 'CONVERTIDA')
        expect(
          screen.getByRole('heading', { name: 'Reserva da venda' }),
        ).toBeVisible();
    },
  );
  it('trata falha e permite nova tentativa', async () => {
    server.use(
      http.get('/v1/lotes/{id}/detalhe', ({ response }) =>
        response(404).json({
          statusCode: 404,
          code: 'LOTE_NAO_ENCONTRADO',
          message: 'Lote não encontrado',
          timestamp: '2026-11-01T12:00:00Z',
          path: '/v1/lotes/id/detalhe',
        }),
      ),
    );
    renderWithQuery(<LoteDetalhe id={lote.id} />);
    expect(
      await screen.findByRole('link', { name: 'Voltar aos lotes' }),
    ).toHaveAttribute('href', '/lotes');
  });
});
