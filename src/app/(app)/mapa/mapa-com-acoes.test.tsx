import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Perfil } from '@/shared/auth/permissoes';
import { ToastProvider } from '@/shared/ui/toast';
import type { VisualizadorPlantaProps } from '@/shared/ui/visualizador-planta';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeCliente } from '@/test/factories/cliente.factory';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeLote } from '@/test/factories/lote.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { mapaSearchSchema } from '@/features/mapa/schemas/mapa-search.schema';
import type { StatusLoteMapa } from '@/features/mapa/api/mapa.api';
import { MapaComAcoes } from './mapa-com-acoes';

vi.mock('next/navigation', () => import('@/test/next-navigation'));
vi.mock('@/shared/ui/visualizador-planta', () => ({
  ALTURA_VISUALIZADOR: 'h-96',
  VisualizadorPlanta: ({
    marcadores = [],
    onMarcadorClick,
  }: VisualizadorPlantaProps) => (
    <div>
      {marcadores.map((marcador) => (
        <button
          key={marcador.id}
          data-cor={marcador.cor}
          onClick={() => onMarcadorClick?.(marcador.id)}
        >
          Abrir marcador
        </button>
      ))}
    </div>
  ),
}));

const LOTE = makeLote();
const CLIENTE = makeCliente();
const META = { page: 1, pageSize: 100, total: 1, totalPages: 1 };
let status: StatusLoteMapa;
let perfil: Perfil;
let removerMarcador: boolean;

beforeEach(() => {
  status = 'DISPONIVEL';
  perfil = 'COMERCIAL';
  removerMarcador = false;
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json({
        id: LOTE.id,
        nome: 'Pessoa teste',
        email: 'teste@exemplo.com',
        perfil,
      }),
    ),
    http.get('/v1/loteamentos', ({ response }) =>
      response(200).json({
        data: [],
        meta: { ...META, total: 0, totalPages: 0 },
      }),
    ),
    http.get('/v1/mapa', ({ response }) =>
      response(200).json({
        planta: {
          id: LOTE.id,
          nome: 'Planta teste',
          versao: 1,
          larguraPx: 1024,
          alturaPx: 1024,
          maxZoom: 2,
          tamanhoTile: 256,
          tilesUrl: '/v1/plantas/p/tiles/{z}/{x}/{y}.webp',
        },
        marcadores: {
          data: removerMarcador
            ? []
            : [
                {
                  id: LOTE.id,
                  loteId: LOTE.id,
                  numero: '12',
                  loteamentoId: LOTE.loteamentoId,
                  loteamento: 'Bela Vista',
                  quadraId: LOTE.quadraId,
                  quadra: 'A',
                  areaM2: LOTE.areaM2,
                  valor: LOTE.valor,
                  x: 0.5,
                  y: 0.5,
                  status,
                  acoes:
                    status === 'DISPONIVEL'
                      ? ['reservar', 'bloquear']
                      : status === 'BLOQUEADO'
                        ? ['desbloquear']
                        : ['verReserva'],
                },
              ],
          meta: META,
        },
      }),
    ),
    http.get('/v1/lotes/{id}/detalhe', ({ response }) =>
      response(200).json({
        lote: { ...LOTE, status },
        loteamento: { id: LOTE.loteamentoId, nome: 'Bela Vista' },
        quadra: { id: LOTE.quadraId, numero: 'A' },
        reserva: null,
        propostas: [],
        historico: [],
      }),
    ),
    http.get('/v1/reservas/previsao', ({ response }) =>
      response(200).json({
        prazoDias: 7,
        dataVencimento: '2099-11-08T12:00:00Z',
      }),
    ),
    http.get('/v1/clientes', ({ response }) =>
      response(200).json({
        data: [{ id: CLIENTE.id, nome: CLIENTE.nome }],
        meta: { ...META, pageSize: 8 },
      }),
    ),
  );
});

async function abrir() {
  const user = userEvent.setup();
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ToastProvider>
        <MapaComAcoes search={mapaSearchSchema.parse({})} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  await user.click(
    await screen.findByRole('button', { name: 'Abrir marcador' }),
  );
  await within(screen.getByRole('dialog')).findByText('Bela Vista');
  return user;
}

async function escolherCliente(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Reservar' }));
  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByRole('combobox'), 'Cliente');
  await user.click(
    await within(dialog).findByRole('option', { name: CLIENTE.nome }),
  );
  await within(dialog).findByText(/7 dias corridos/);
  return dialog;
}

describe('ações no mapa', () => {
  it('reserva usando o mesmo fluxo e atualiza a cor do marcador', async () => {
    server.use(
      http.post('/v1/reservas', ({ response }) => {
        status = 'RESERVADO';
        return response(201).json({
          id: LOTE.id,
          loteId: LOTE.id,
          clienteId: CLIENTE.id,
          vendedorId: LOTE.id,
          status: 'ATIVA',
          dataInicio: '2099-11-01T12:00:00Z',
          dataVencimento: '2099-11-08T12:00:00Z',
          tempoRestanteSegundos: 604800,
        });
      }),
    );
    const user = await abrir();
    const dialog = await escolherCliente(user);
    await expectNoA11yViolations(dialog);
    await user.click(
      within(dialog).getByRole('button', { name: 'Confirmar reserva' }),
    );
    expect(await screen.findByText('Reserva criada')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Abrir marcador' }),
      ).toHaveAttribute('data-cor', '--status-reservado'),
    );
  });
  it('gestor bloqueia com motivo e recebe o novo status', async () => {
    perfil = 'GESTOR';
    server.use(
      http.post('/v1/lotes/{id}/bloquear', async ({ request, response }) => {
        expect(await request.json()).toEqual({
          motivo: 'Revisão administrativa',
        });
        status = 'BLOQUEADO';
        return response(200).json({ ...LOTE, status });
      }),
    );
    const user = await abrir();
    await user.click(
      await screen.findByRole('button', { name: 'Bloquear lote' }),
    );
    const dialog = screen.getByRole('dialog');
    await user.type(
      within(dialog).getByRole('textbox', { name: /Motivo/ }),
      'Revisão administrativa',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Bloquear lote' }),
    );
    expect(await screen.findByText('Lote bloqueado')).toBeInTheDocument();
    expect(
      await screen.findByText('Bloqueado', { selector: 'span' }),
    ).toBeInTheDocument();
  });
  it('mantém o conflito visível mesmo quando o filtro remove o marcador', async () => {
    server.use(
      http.post('/v1/reservas', ({ response }) => {
        status = 'RESERVADO';
        removerMarcador = true;
        return response(409).json(
          makeErrorResponse({ statusCode: 409, code: 'LOTE_NAO_DISPONIVEL' }),
        );
      }),
    );
    const user = await abrir();
    const dialog = await escolherCliente(user);
    await user.click(
      within(dialog).getByRole('button', { name: 'Confirmar reserva' }),
    );
    expect(
      await screen.findByText('O lote não está mais disponível para reserva'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Reservado', { selector: 'span' }),
    ).toBeInTheDocument();
  });
  it('Consulta não recebe mutações mesmo com flags indevidas na resposta', async () => {
    perfil = 'CONSULTA';
    await abrir();
    expect(
      screen.queryByRole('button', { name: 'Reservar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Bloquear lote' }),
    ).not.toBeInTheDocument();
  });
});
