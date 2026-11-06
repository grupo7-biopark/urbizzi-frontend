import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Perfil } from '@/shared/auth/permissoes';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeLoteamento } from '@/test/factories/loteamento.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import type {
  MarcadorPlanta,
  VisualizadorPlantaProps,
} from '@/shared/ui/visualizador-planta';
import type { MarcadorMapa, PlantaMapa } from '../api/mapa.api';
import { mapaSearchSchema } from '../schemas/mapa-search.schema';
import { MapaInterno } from './mapa-interno';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

// O Leaflet tem testes próprios: aqui, o que importa é o que a tela entrega a ele.
vi.mock('@/shared/ui/visualizador-planta', () => ({
  ALTURA_VISUALIZADOR: 'h-96',
  VisualizadorPlanta: ({
    planta,
    marcadores = [],
    onMarcadorClick,
    foco,
  }: VisualizadorPlantaProps) => (
    <div data-testid="visualizador" data-tiles={planta.tilesUrl}>
      {foco ? <span>foco em {`${foco.x},${foco.y}`}</span> : null}
      {marcadores.map((marcador: MarcadorPlanta) => (
        <button
          key={marcador.id}
          type="button"
          data-cor={marcador.cor}
          data-forma={marcador.forma}
          data-destacado={String(Boolean(marcador.destacado))}
          onClick={() => onMarcadorClick?.(marcador.id)}
        >
          marcador {marcador.id}
        </button>
      ))}
    </div>
  ),
}));

const PLANTA: PlantaMapa = {
  id: '7a3e5b2c-8a52-4a8e-9d3f-2c7f1e5a9b10',
  nome: 'Masterplan',
  versao: 1,
  larguraPx: 2048,
  alturaPx: 1024,
  maxZoom: 3,
  tamanhoTile: 256,
  tilesUrl: '/v1/plantas/7a3e/tiles/{z}/{x}/{y}.webp',
};

function makeMarcador(overrides: Partial<MarcadorMapa> = {}): MarcadorMapa {
  return {
    id: 'm1',
    loteId: '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    x: 0.25,
    y: 0.5,
    numero: '12',
    quadraId: '1c1b8f8e-5a52-4a8e-9d3f-2c7f1e5a9b10',
    quadra: 'A',
    loteamentoId: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    loteamento: 'Bela Vista',
    areaM2: '360.00',
    valor: '250000.00',
    status: 'DISPONIVEL',
    acoes: [],
    ...overrides,
  };
}

const MARCADORES = [
  makeMarcador(),
  makeMarcador({ id: 'm2', numero: '13', status: 'RESERVADO', valor: null }),
  makeMarcador({ id: 'm3', numero: '20', status: 'VENDIDO' }),
  makeMarcador({ id: 'm4', numero: '21', status: 'BLOQUEADO' }),
];

function renderMapa(busca: Record<string, string> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MapaInterno search={mapaSearchSchema.parse(busca)} />
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

function mockMapa(marcadores: MarcadorMapa[] = MARCADORES, planta = PLANTA) {
  const buscas: URLSearchParams[] = [];
  server.use(
    http.get('/v1/mapa', ({ request, response }) => {
      buscas.push(new URL(request.url).searchParams);
      return response(200).json({
        planta,
        marcadores: {
          data: marcadores,
          meta: {
            page: 1,
            pageSize: 100,
            total: marcadores.length,
            totalPages: 1,
          },
        },
      });
    }),
  );
  return buscas;
}

function mockErro(statusCode: number, code: string, message: string) {
  server.use(
    http.untyped.get('*/v1/mapa', () =>
      HttpResponse.json(makeErrorResponse({ statusCode, code, message }), {
        status: statusCode,
      }),
    ),
  );
}

beforeEach(() => {
  setTestUrl('/mapa');
  server.use(
    http.get('/v1/loteamentos', ({ response }) =>
      response(200).json({
        data: [makeLoteamento({ nome: 'Bela Vista' })],
        meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
      }),
    ),
  );
});

describe('MapaInterno', () => {
  it('mostra o carregamento e, depois, a planta com os tiles pelo proxy', async () => {
    mockMapa();

    renderMapa();

    expect(screen.getByLabelText('Carregando o mapa')).toBeInTheDocument();
    expect(await screen.findByTestId('visualizador')).toHaveAttribute(
      'data-tiles',
      '/api/backend/v1/plantas/7a3e/tiles/{z}/{x}/{y}.webp',
    );
    expect(screen.getByText('4 lotes no mapa')).toBeInTheDocument();
  });

  it('usa o singular com um lote só', async () => {
    mockMapa([makeMarcador()]);

    renderMapa();

    expect(await screen.findByText('1 lote no mapa')).toBeInTheDocument();
  });

  it('cada status tem cor e forma próprias', async () => {
    mockMapa();

    renderMapa();

    await screen.findByTestId('visualizador');
    const esperado = [
      ['m1', '--status-disponivel', 'circulo'],
      ['m2', '--status-reservado', 'quadrado'],
      ['m3', '--status-vendido', 'triangulo'],
      ['m4', '--status-bloqueado', 'losango'],
    ];
    for (const [id, cor, forma] of esperado) {
      const marcador = screen.getByRole('button', { name: `marcador ${id}` });
      expect(marcador).toHaveAttribute('data-cor', cor);
      expect(marcador).toHaveAttribute('data-forma', forma);
    }
  });

  it('a legenda traz os quatro status, com texto, sem violações', async () => {
    mockMapa();

    const { container } = renderMapa();

    const legenda = await screen.findByRole('list', {
      name: 'Legenda do mapa',
    });
    for (const status of ['Disponível', 'Reservado', 'Vendido', 'Bloqueado']) {
      expect(within(legenda).getByText(status)).toBeInTheDocument();
    }
    expect(legenda.querySelectorAll('svg')).toHaveLength(4);
    await expectNoA11yViolations(container);
  });

  it('a legenda não oferece proposta aprovada como status', async () => {
    mockMapa();

    renderMapa();

    await screen.findByTestId('visualizador');
    expect(screen.queryByText(/aprovada/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /aprovada/i }),
    ).not.toBeInTheDocument();
  });

  it('envia os filtros da URL à API', async () => {
    const LOTEAMENTO = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';
    const buscas = mockMapa();

    renderMapa({ loteamentoId: LOTEAMENTO, status: 'VENDIDO' });

    await screen.findByTestId('visualizador');
    expect(buscas[0]?.get('loteamentoId')).toBe(LOTEAMENTO);
    expect(buscas[0]?.get('status')).toBe('VENDIDO');
    expect(buscas[0]?.get('pageSize')).toBe('100');
  });

  it('mudar o filtro de status vai para a URL', async () => {
    mockMapa();
    const user = userEvent.setup();
    renderMapa();

    await screen.findByTestId('visualizador');
    await user.selectOptions(screen.getByLabelText('Status'), 'RESERVADO');

    await waitFor(() =>
      expect(window.location.search).toBe('?status=RESERVADO'),
    );
  });

  it('percorre todas as páginas, para o mapa mostrar todos os lotes', async () => {
    const paginas: string[] = [];
    server.use(
      http.get('/v1/mapa', ({ request, response }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        paginas.push(String(page));
        return response(200).json({
          planta: PLANTA,
          marcadores: {
            data: [makeMarcador({ id: `pagina-${page}` })],
            meta: { page, pageSize: 100, total: 3, totalPages: 3 },
          },
        });
      }),
    );

    renderMapa();

    expect(await screen.findByText('3 lotes no mapa')).toBeInTheDocument();
    expect(paginas).toEqual(['1', '2', '3']);
  });

  it('o clique no marcador abre o painel com os dados e o link do lote', async () => {
    mockMapa();
    const user = userEvent.setup();
    renderMapa();

    await user.click(
      await screen.findByRole('button', { name: 'marcador m1' }),
    );

    const painel = await screen.findByRole('dialog', { name: 'Lote 12' });
    expect(within(painel).getByText('A')).toBeInTheDocument();
    expect(within(painel).getByText('Bela Vista')).toBeInTheDocument();
    expect(within(painel).getByText('360,00 m²')).toBeInTheDocument();
    expect(within(painel).getByText('R$ 250.000,00')).toBeInTheDocument();
    expect(within(painel).getByText('Disponível')).toBeInTheDocument();
    expect(
      within(painel).getByRole('link', { name: 'Ver detalhes do lote' }),
    ).toHaveAttribute('href', `/lotes/${makeMarcador().loteId}`);

    await user.click(within(painel).getByRole('button', { name: 'Fechar' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('avisa no painel quando o valor não foi definido', async () => {
    mockMapa();
    const user = userEvent.setup();
    renderMapa();

    await user.click(
      await screen.findByRole('button', { name: 'marcador m2' }),
    );

    const painel = await screen.findByRole('dialog', { name: 'Lote 13' });
    expect(within(painel).getByText('Não definido')).toBeInTheDocument();
    expect(within(painel).getByText('Reservado')).toBeInTheDocument();
  });

  it('a busca aproxima do marcador, destaca e dá acesso aos dados pelo teclado', async () => {
    mockMapa();
    const user = userEvent.setup();
    renderMapa();

    await screen.findByTestId('visualizador');
    await user.type(screen.getByLabelText(/Buscar lote/), '13');
    await user.click(
      within(screen.getByRole('list', { name: 'Lotes encontrados' })).getByRole(
        'button',
        { name: 'Lote 13, quadra A, Bela Vista' },
      ),
    );

    expect(screen.getByText('foco em 0.25,0.5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'marcador m2' })).toHaveAttribute(
      'data-destacado',
      'true',
    );
    expect(screen.getByLabelText(/Buscar lote/)).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Ver dados do lote' }));

    expect(
      await screen.findByRole('dialog', { name: 'Lote 13' }),
    ).toBeInTheDocument();
  });

  it('a busca avisa quando não encontra', async () => {
    mockMapa();
    const user = userEvent.setup();
    renderMapa();

    await screen.findByTestId('visualizador');
    await user.type(screen.getByLabelText(/Buscar lote/), '999');

    expect(
      screen.getByText('Nenhum lote com esse número no mapa.'),
    ).toBeInTheDocument();
  });

  it('a busca limita os resultados e pede para refinar', async () => {
    mockMapa(
      Array.from({ length: 10 }, (_, index) =>
        makeMarcador({ id: `m${index}`, numero: `1${index}` }),
      ),
    );
    const user = userEvent.setup();
    renderMapa();

    await screen.findByTestId('visualizador');
    await user.type(screen.getByLabelText(/Buscar lote/), '1');

    expect(
      within(
        screen.getByRole('list', { name: 'Lotes encontrados' }),
      ).getAllByRole('button'),
    ).toHaveLength(8);
    expect(screen.getByText(/Mostrando 8 de 10/)).toBeInTheDocument();
  });

  it('sem planta ativa, o Gestor recebe o caminho para as plantas', async () => {
    mockPerfil('GESTOR');
    mockErro(
      404,
      'PLANTA_ATIVA_NAO_ENCONTRADA',
      'Nenhuma planta ativa encontrada',
    );

    renderMapa();

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

    renderMapa();

    expect(await screen.findByText('Nenhuma planta ativa')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Ir para as plantas' }),
    ).not.toBeInTheDocument();
  });

  it('trata como sem planta uma ativa sem os metadados', async () => {
    mockPerfil('CONSULTA');
    mockMapa([], { ...PLANTA, maxZoom: null });

    renderMapa();

    expect(await screen.findByText('Nenhuma planta ativa')).toBeInTheDocument();
    expect(screen.queryByTestId('visualizador')).not.toBeInTheDocument();
  });

  it('em uma falha, permite tentar de novo', async () => {
    mockErro(500, 'ERRO_INTERNO', 'Internal server error');
    const user = userEvent.setup();
    renderMapa();

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    mockMapa();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByTestId('visualizador')).toBeInTheDocument();
  });
});
