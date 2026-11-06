import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { Perfil } from '@/shared/auth/permissoes';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import type { PlantaAtiva } from '../api/mapa.api';
import { PlantaAtivaVisualizador } from './planta-ativa';

vi.mock('@/shared/ui/visualizador-planta', () => ({
  ALTURA_VISUALIZADOR: 'h-96',
  VisualizadorPlanta: ({ planta }: { planta: { tilesUrl: string } }) => (
    <div data-testid="visualizador">{planta.tilesUrl}</div>
  ),
}));

const PLANTA: PlantaAtiva = {
  id: '7a3e5b2c-8a52-4a8e-9d3f-2c7f1e5a9b10',
  nome: 'Masterplan',
  versao: 1,
  status: 'PRONTA',
  ativa: true,
  gradeLinhas: 1,
  gradeColunas: 1,
  larguraPx: 2048,
  alturaPx: 1024,
  maxZoom: 3,
  tamanhoTile: 256,
  mensagemErro: null,
  criadoPorId: '9c4d2e1f-8a52-4a8e-9d3f-2c7f1e5a9b10',
  createdAt: '2026-10-28T12:00:00.000Z',
  updatedAt: '2026-10-28T12:00:00.000Z',
  tilesUrl: '/v1/plantas/7a3e/tiles/{z}/{x}/{y}.webp',
};

function renderTela() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PlantaAtivaVisualizador />
    </QueryClientProvider>,
  );
}

function mockPerfil(perfil: Perfil) {
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json({
        id: '7d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
        nome: 'Pessoa Teste',
        email: 'pessoa@exemplo.com',
        perfil,
      }),
    ),
  );
}

function mockErro(statusCode: number, code: string, message: string) {
  server.use(
    http.untyped.get('*/v1/plantas/ativa', () =>
      HttpResponse.json(makeErrorResponse({ statusCode, code, message }), {
        status: statusCode,
      }),
    ),
  );
}

describe('PlantaAtivaVisualizador', () => {
  it('mostra o carregamento e, depois, a planta, com os tiles pelo proxy', async () => {
    server.use(
      http.get('/v1/plantas/ativa', ({ response }) =>
        response(200).json(PLANTA),
      ),
    );

    renderTela();

    expect(screen.getByLabelText('Carregando a planta')).toBeInTheDocument();
    expect(await screen.findByTestId('visualizador')).toHaveTextContent(
      '/api/backend/v1/plantas/7a3e/tiles/{z}/{x}/{y}.webp',
    );
  });

  it('sem planta ativa, o Gestor recebe o caminho para as plantas', async () => {
    mockPerfil('GESTOR');
    mockErro(
      404,
      'PLANTA_ATIVA_NAO_ENCONTRADA',
      'Nenhuma planta ativa encontrada',
    );

    renderTela();

    expect(await screen.findByText('Nenhuma planta ativa')).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Ir para as plantas' }),
    ).toHaveAttribute('href', '/plantas');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sem planta ativa, o Comercial não recebe o caminho', async () => {
    mockPerfil('COMERCIAL');
    mockErro(
      404,
      'PLANTA_ATIVA_NAO_ENCONTRADA',
      'Nenhuma planta ativa encontrada',
    );

    renderTela();

    expect(await screen.findByText('Nenhuma planta ativa')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Ir para as plantas' }),
    ).not.toBeInTheDocument();
  });

  it('trata como sem planta uma ativa sem os metadados', async () => {
    mockPerfil('CONSULTA');
    server.use(
      http.get('/v1/plantas/ativa', ({ response }) =>
        response(200).json({ ...PLANTA, maxZoom: null }),
      ),
    );

    renderTela();

    expect(await screen.findByText('Nenhuma planta ativa')).toBeInTheDocument();
    expect(screen.queryByTestId('visualizador')).not.toBeInTheDocument();
  });

  it('em uma falha, permite tentar de novo', async () => {
    mockErro(500, 'ERRO_INTERNO', 'Internal server error');
    const user = userEvent.setup();
    renderTela();

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    server.use(
      http.get('/v1/plantas/ativa', ({ response }) =>
        response(200).json(PLANTA),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByTestId('visualizador')).toBeInTheDocument();
  });
});
