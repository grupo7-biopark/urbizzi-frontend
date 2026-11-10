import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { makeProposta } from '@/test/factories/proposta.factory';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { propostasSearchSchema } from '../schemas/propostas-search.schema';
import { MinhasPropostasTable } from './minhas-propostas-table';

vi.mock('next/navigation', () => import('@/test/next-navigation'));
const META = { page: 1, pageSize: 20, total: 2, totalPages: 1 };

describe('MinhasPropostasTable', () => {
  it.each(['EM_ANALISE', 'APROVADA'] as const)(
    'mostra encerramento de proposta %s sem simular rejeição ou análise pendente',
    async (status) => {
      setTestUrl('/propostas');
      server.use(
        http.get('/v1/propostas/minhas', ({ response }) =>
          response(200).json({
            data: [
              makeProposta({
                status,
                encerrada: true,
                dataEncerramento: '2026-11-10T12:00:00Z',
                motivoEncerramento: 'Cancelamento da reserva',
                prazoLimite: '2000-01-01T12:00:00Z',
                dataDecisao:
                  status === 'APROVADA' ? '2026-11-09T12:00:00Z' : null,
                motivoDecisao:
                  status === 'APROVADA'
                    ? 'Aprovação original preservada'
                    : null,
              }),
            ],
            meta: { ...META, total: 1 },
          }),
        ),
      );
      renderWithQuery(
        <MinhasPropostasTable search={propostasSearchSchema.parse({})} />,
      );
      expect(await screen.findByText('Encerrada')).toBeVisible();
      expect(screen.getByText('Cancelamento da reserva')).toBeVisible();
      expect(screen.queryByText('Aguardando análise')).not.toBeInTheDocument();
      expect(screen.queryByText('Em análise')).not.toBeInTheDocument();
      expect(screen.queryByText('Rejeitada')).not.toBeInTheDocument();
      expect(screen.queryByText('Prazo encerrado')).not.toBeInTheDocument();
      expect(screen.queryByText('Em atraso')).not.toBeInTheDocument();
      expect(screen.queryAllByText('Aprovada')).toHaveLength(
        status === 'APROVADA' ? 1 : 0,
      );
      expect(
        screen.queryAllByText('Aprovação original preservada'),
      ).toHaveLength(status === 'APROVADA' ? 1 : 0);
      expect(screen.queryAllByText('Sem decisão')).toHaveLength(
        status === 'EM_ANALISE' ? 1 : 0,
      );
    },
  );
  it('consulta apenas minhas e mostra prazo, atraso e motivo da rejeição', async () => {
    setTestUrl('/propostas');
    server.use(
      http.get('/v1/propostas/minhas', ({ request, response }) => {
        expect(new URL(request.url).searchParams.has('vendedorId')).toBe(false);
        return response(200).json({
          data: [
            makeProposta({
              status: 'REJEITADA',
              motivoDecisao: 'Valor abaixo do mínimo',
              dataDecisao: '2026-11-09T14:00:00Z',
            }),
            makeProposta({
              id: '7d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
              atrasada: true,
              prazoLimite: '2000-01-01T12:00:00Z',
            }),
          ],
          meta: META,
        });
      }),
    );
    renderWithQuery(
      <MinhasPropostasTable
        search={propostasSearchSchema.parse({ vendedorId: 'outro' })}
      />,
    );
    expect(
      await screen.findByText('Valor abaixo do mínimo'),
    ).toBeInTheDocument();
    expect(screen.getByText('Rejeitada')).toBeInTheDocument();
    expect(screen.getByText('Em atraso')).toBeInTheDocument();
    expect(screen.getByText('Aguardando análise')).toBeInTheDocument();
  });
  it('mostra vazio e permite repetir a consulta após perda de rede', async () => {
    setTestUrl('/propostas');
    server.use(
      http.untyped.get('*/v1/propostas/minhas', () => HttpResponse.error()),
    );
    renderWithQuery(
      <MinhasPropostasTable search={propostasSearchSchema.parse({})} />,
    );
    const tentar = await screen.findByRole('button', {
      name: 'Tentar novamente',
    });
    server.use(
      http.get('/v1/propostas/minhas', ({ response }) =>
        response(200).json({
          data: [],
          meta: { ...META, total: 0, totalPages: 0 },
        }),
      ),
    );
    await userEvent.click(tentar);
    expect(
      await screen.findByText('Você ainda não enviou propostas'),
    ).toBeInTheDocument();
  });
  it('mostra a recusa de permissão da API', async () => {
    setTestUrl('/propostas');
    server.use(
      http.get('/v1/propostas/minhas', ({ response }) =>
        response(403).json(
          makeErrorResponse({ statusCode: 403, code: 'ACESSO_NEGADO' }),
        ),
      ),
    );
    renderWithQuery(
      <MinhasPropostasTable search={propostasSearchSchema.parse({})} />,
    );
    expect(
      await screen.findByText(
        'Você não tem permissão para executar esta ação.',
      ),
    ).toBeInTheDocument();
  });
});
