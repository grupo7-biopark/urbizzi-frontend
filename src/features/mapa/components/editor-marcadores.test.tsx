import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Perfil } from '@/shared/auth/permissoes';
import { ToastProvider } from '@/shared/ui/toast';
import type { VisualizadorPlantaProps } from '@/shared/ui/visualizador-planta';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeLoteamento } from '@/test/factories/loteamento.factory';
import { makeQuadra } from '@/test/factories/quadra.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import type { MarcadorMapa, PlantaMapa } from '../api/mapa.api';
import { EditorMarcadores } from './editor-marcadores';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

// O Leaflet tem testes próprios: aqui, botões fazem o papel dos gestos no mapa.
vi.mock('@/shared/ui/visualizador-planta', async () => {
  const { useEffect } = await import('react');

  return {
    ALTURA_VISUALIZADOR: 'h-96',
    VisualizadorPlanta: ({
      marcadores = [],
      onMarcadorClick,
      onPlantaClick,
      onMarcadorArrastado,
      onCentroChange,
    }: VisualizadorPlantaProps) => {
      useEffect(() => {
        onCentroChange?.({ x: 0.4, y: 0.6 });
      }, [onCentroChange]);

      return (
        <div data-testid="visualizador">
          <button
            type="button"
            onClick={() => onPlantaClick?.({ x: 0.1, y: 0.2 })}
          >
            clicar na planta
          </button>
          {marcadores.map(({ id, cor, forma, x, y, destacado }) => (
            <span key={id}>
              <button
                type="button"
                data-cor={cor}
                data-forma={forma}
                data-destacado={String(Boolean(destacado))}
                data-posicao={`${x},${y}`}
                onClick={() => onMarcadorClick?.(id)}
              >
                marcador {forma}
              </button>
              <button
                type="button"
                onClick={() => onMarcadorArrastado?.(id, { x: 0.9, y: 0.9 })}
              >
                arrastar {forma}
              </button>
            </span>
          ))}
        </div>
      );
    },
  };
});

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
const LOTEAMENTO = makeLoteamento({ nome: 'Bela Vista' });
const QUADRA = makeQuadra({ numero: 'Q1' });
const MARCADOR_ID = '11111111-1111-4111-8111-111111111111';
const LOTE_ID = '22222222-2222-4222-8222-222222222222';
const L1 = '33333333-3333-4333-8333-333333333333';
const L2 = '44444444-4444-4444-8444-444444444444';
const LOTE_SALVO: MarcadorMapa = {
  id: MARCADOR_ID,
  loteId: LOTE_ID,
  x: 0.25,
  y: 0.5,
  numero: '12',
  quadraId: QUADRA.id,
  quadra: 'Q1',
  loteamentoId: LOTEAMENTO.id,
  loteamento: 'Bela Vista',
  areaM2: '360.00',
  valor: null,
  status: 'DISPONIVEL',
  acoes: [],
};

const META = { page: 1, pageSize: 100, total: 1, totalPages: 1 };

function makeSemMarcador(id: string, numero: string) {
  return { id, numero, quadraId: QUADRA.id, loteamentoId: LOTEAMENTO.id };
}

function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <EditorMarcadores />
      </ToastProvider>
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

function mockEditor({
  salvos = [LOTE_SALVO],
  revisar = false,
  semMarcador = [makeSemMarcador(L1, '1'), makeSemMarcador(L2, '2')],
}: {
  salvos?: MarcadorMapa[];
  revisar?: boolean;
  semMarcador?: ReturnType<typeof makeSemMarcador>[];
} = {}) {
  const buscas: string[] = [];
  server.use(
    http.get('/v1/mapa', ({ response }) =>
      response(200).json({
        planta: PLANTA,
        marcadores: { data: salvos, meta: { ...META, total: salvos.length } },
      }),
    ),
    http.get('/v1/plantas/{plantaId}/marcadores', ({ response }) =>
      response(200).json({
        data: salvos.map(({ id, loteId, x, y }) => ({
          id,
          plantaId: PLANTA.id,
          loteId,
          x,
          y,
          revisar,
        })),
        meta: { ...META, total: salvos.length },
      }),
    ),
    http.get(
      '/v1/plantas/{plantaId}/lotes-sem-marcador',
      ({ request, response }) => {
        buscas.push(new URL(request.url).search);
        return response(200).json({
          data: semMarcador,
          meta: { ...META, total: semMarcador.length },
        });
      },
    ),
    http.get('/v1/loteamentos', ({ response }) =>
      response(200).json({ data: [LOTEAMENTO], meta: META }),
    ),
    http.get('/v1/quadras/{id}', ({ response }) => response(200).json(QUADRA)),
  );
  return buscas;
}

function mockSalvar() {
  const criados: unknown[] = [];
  const movidos: unknown[] = [];
  server.use(
    mswHttp.post(
      '*/v1/plantas/:plantaId/marcadores/lote',
      async ({ request }) => {
        criados.push(await request.json());
        return HttpResponse.json([], { status: 201 });
      },
    ),
    mswHttp.patch(
      '*/v1/plantas/:plantaId/marcadores/:id',
      async ({ request, params }) => {
        movidos.push({ id: params.id, ...((await request.json()) as object) });
        return HttpResponse.json({});
      },
    ),
  );
  return { criados, movidos };
}

function botaoDoLote(numero: string) {
  return screen.findByRole('button', {
    name: new RegExp(`^Lote ${numero}, quadra`),
  });
}

function botaoSalvar(nome: string | RegExp = /^Salvar/) {
  return screen.getByRole('button', { name: nome });
}

beforeEach(() => {
  setTestUrl('/mapa/editor');
  mockPerfil('GESTOR');
});

describe('EditorMarcadores', () => {
  it('mostra a lista de lotes, a legenda e os salvos, sem violações', async () => {
    mockEditor();

    const { container } = renderEditor();

    expect(screen.getByLabelText('Carregando o editor')).toBeInTheDocument();
    expect(await botaoDoLote('1')).toBeInTheDocument();
    expect(screen.getByText('2 lotes sem marcador')).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Legenda do editor' })).getByText(
        'Não salvo',
      ),
    ).toBeInTheDocument();
    expect(botaoSalvar()).toBeDisabled();
    await screen.findAllByText(/quadra Q1/);
    await expectNoA11yViolations(container);
  });

  it('filtra por loteamento na API e por número na lista', async () => {
    const buscas = mockEditor();
    const user = userEvent.setup();
    renderEditor();

    await botaoDoLote('1');
    await user.selectOptions(
      screen.getByLabelText('Loteamento'),
      LOTEAMENTO.id,
    );
    await waitFor(() =>
      expect(buscas.at(-1)).toContain(`loteamentoId=${LOTEAMENTO.id}`),
    );

    await user.type(screen.getByLabelText('Buscar por número'), '2');

    expect(screen.getByText('1 lote sem marcador')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Lote 1,/ }),
    ).not.toBeInTheDocument();
  });

  it('escolher o lote e clicar na planta cria o marcador e tira o lote da lista', async () => {
    mockEditor();
    const user = userEvent.setup();
    renderEditor();

    const lote = await botaoDoLote('1');
    await user.click(lote);
    expect(lote).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByText(/Clique na planta para posicionar o lote 1/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'clicar na planta' }));

    expect(screen.getByText('1 lote sem marcador')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Lote 1,/ }),
    ).not.toBeInTheDocument();
    expect(botaoSalvar('Salvar (1)')).toBeEnabled();
  });

  it('escolher de novo o mesmo lote desfaz a escolha', async () => {
    mockEditor();
    const user = userEvent.setup();
    renderEditor();

    const lote = await botaoDoLote('1');
    await user.click(lote);
    await user.click(lote);

    expect(lote).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicar na planta sem lote exige vincular antes de salvar', async () => {
    mockEditor();
    const user = userEvent.setup();
    renderEditor();

    await botaoDoLote('1');
    await user.click(screen.getByRole('button', { name: 'clicar na planta' }));

    expect(
      screen.getByText('Escolha na lista o lote deste marcador.'),
    ).toBeInTheDocument();
    expect(botaoSalvar('Salvar (1)')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'marcador losango' }),
    ).toHaveAttribute('data-cor', '--danger');

    await user.click(await botaoDoLote('2'));

    expect(botaoSalvar('Salvar (1)')).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'marcador quadrado' }),
    ).toHaveAttribute('data-cor', '--accent');
  });

  it('salva novos e movidos de uma vez, e fica sem pendências', async () => {
    mockEditor();
    const { criados, movidos } = mockSalvar();
    const user = userEvent.setup();
    renderEditor();

    await user.click(await botaoDoLote('1'));
    await user.click(screen.getByRole('button', { name: 'clicar na planta' }));
    await user.click(screen.getByRole('button', { name: 'arrastar circulo' }));
    expect(botaoSalvar('Salvar (2)')).toBeEnabled();

    await user.click(botaoSalvar('Salvar (2)'));

    expect(await screen.findByText('Marcadores salvos')).toBeInTheDocument();
    expect(criados).toEqual([{ marcadores: [{ loteId: L1, x: 0.1, y: 0.2 }] }]);
    expect(movidos).toEqual([{ id: MARCADOR_ID, x: 0.9, y: 0.9 }]);
    expect(botaoSalvar('Salvar')).toBeDisabled();
  });

  it('em uma falha, mantém pendente o que não foi salvo e mostra o motivo', async () => {
    mockEditor();
    server.use(
      mswHttp.post('*/v1/plantas/:plantaId/marcadores/lote', () =>
        HttpResponse.json(
          makeErrorResponse({
            statusCode: 409,
            code: 'MARCADOR_DUPLICADO',
            message: 'O lote já tem marcador nesta planta',
          }),
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderEditor();

    await user.click(await botaoDoLote('1'));
    await user.click(screen.getByRole('button', { name: 'clicar na planta' }));
    await user.click(botaoSalvar('Salvar (1)'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O lote já tem marcador nesta planta',
    );
    expect(botaoSalvar('Salvar (1)')).toBeEnabled();
  });

  it('descartar devolve os marcadores ao estado salvo', async () => {
    mockEditor();
    const user = userEvent.setup();
    renderEditor();

    await botaoDoLote('1');
    await user.click(screen.getByRole('button', { name: 'arrastar circulo' }));
    expect(
      screen.getByRole('button', { name: 'marcador quadrado' }),
    ).toHaveAttribute('data-posicao', '0.9,0.9');

    await user.click(
      screen.getByRole('button', { name: 'Descartar alterações' }),
    );

    expect(
      screen.getByRole('button', { name: 'marcador circulo' }),
    ).toHaveAttribute('data-posicao', '0.25,0.5');
    expect(botaoSalvar()).toBeDisabled();
  });

  it('move o selecionado para o centro da tela, sem usar o mouse no mapa', async () => {
    mockEditor();
    const user = userEvent.setup();
    renderEditor();

    await botaoDoLote('1');
    await user.click(screen.getByRole('button', { name: 'marcador circulo' }));
    await user.click(
      screen.getByRole('button', { name: 'Mover para o centro da tela' }),
    );

    expect(
      screen.getByRole('button', { name: 'marcador quadrado' }),
    ).toHaveAttribute('data-posicao', '0.4,0.6');
  });

  it('coloca o lote escolhido no centro da tela', async () => {
    mockEditor();
    const user = userEvent.setup();
    renderEditor();

    await user.click(await botaoDoLote('1'));
    await user.click(
      screen.getByRole('button', { name: 'Colocar no centro da tela' }),
    );

    expect(
      screen.getByRole('button', { name: 'marcador quadrado' }),
    ).toHaveAttribute('data-posicao', '0.4,0.6');
  });

  it('descarta um marcador novo sem pedir confirmação', async () => {
    mockEditor();
    const user = userEvent.setup();
    renderEditor();

    await botaoDoLote('1');
    await user.click(screen.getByRole('button', { name: 'clicar na planta' }));
    await user.click(
      screen.getByRole('button', { name: 'Descartar marcador' }),
    );

    expect(
      screen.queryByRole('button', { name: 'marcador losango' }),
    ).not.toBeInTheDocument();
    expect(botaoSalvar()).toBeDisabled();
  });

  it('remove um marcador salvo depois de confirmar', async () => {
    mockEditor();
    const removidos: string[] = [];
    server.use(
      mswHttp.delete('*/v1/plantas/:plantaId/marcadores/:id', ({ params }) => {
        removidos.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderEditor();

    await botaoDoLote('1');
    await user.click(screen.getByRole('button', { name: 'marcador circulo' }));
    await user.click(screen.getByRole('button', { name: 'Remover marcador' }));
    const dialogo = await screen.findByRole('dialog', {
      name: 'Remover o marcador do lote 12?',
    });
    await user.click(
      within(dialogo).getByRole('button', { name: 'Remover marcador' }),
    );

    await waitFor(() => expect(removidos).toEqual([MARCADOR_ID]));
    expect(await screen.findByText('Marcador removido')).toBeInTheDocument();
  });

  it('destaca os marcadores a revisar e permite confirmar', async () => {
    mockEditor({ revisar: true });
    const revisados: string[] = [];
    server.use(
      mswHttp.post(
        '*/v1/plantas/:plantaId/marcadores/:id/revisar',
        ({ params }) => {
          revisados.push(String(params.id));
          return HttpResponse.json({});
        },
      ),
    );
    const user = userEvent.setup();
    renderEditor();

    const lista = await screen.findByRole('list', {
      name: 'Marcadores a revisar',
    });
    expect(
      screen.getByRole('button', { name: 'marcador triangulo' }),
    ).toHaveAttribute('data-cor', '--status-reservado');

    await user.click(
      within(lista).getByRole('button', {
        name: 'Lote 12, quadra Q1, Bela Vista',
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Marcar como revisado' }),
    );

    await waitFor(() => expect(revisados).toEqual([MARCADOR_ID]));
  });

  it('selecionar um marcador desfaz a escolha do lote', async () => {
    mockEditor({ revisar: true });
    const user = userEvent.setup();
    renderEditor();

    const lote = await botaoDoLote('1');
    await user.click(lote);
    await user.click(
      within(
        screen.getByRole('list', { name: 'Marcadores a revisar' }),
      ).getByRole('button', { name: 'Lote 12, quadra Q1, Bela Vista' }),
    );

    expect(lote).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.queryByRole('button', { name: 'Colocar no centro da tela' }),
    ).not.toBeInTheDocument();
  });

  it('marcador comum não oferece a revisão', async () => {
    mockEditor();
    const user = userEvent.setup();
    renderEditor();

    await botaoDoLote('1');
    await user.click(screen.getByRole('button', { name: 'marcador circulo' }));

    expect(
      screen.queryByRole('button', { name: 'Marcar como revisado' }),
    ).not.toBeInTheDocument();
  });

  describe('aviso ao sair', () => {
    it('sem alterações, deixa seguir o link', async () => {
      mockEditor();
      renderEditor();
      await botaoDoLote('1');

      const clique = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      screen.getByRole('link', { name: 'Mapa' }).dispatchEvent(clique);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('com alterações, pergunta antes de seguir um link', async () => {
      mockEditor();
      const user = userEvent.setup();
      renderEditor();

      await botaoDoLote('1');
      await user.click(
        screen.getByRole('button', { name: 'arrastar circulo' }),
      );
      await user.click(screen.getByRole('link', { name: 'Mapa' }));

      const aviso = await screen.findByRole('dialog', {
        name: 'Sair sem salvar?',
      });
      expect(window.location.pathname).toBe('/mapa/editor');

      await user.click(
        within(aviso).getByRole('button', { name: 'Continuar editando' }),
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      );
      expect(botaoSalvar('Salvar (1)')).toBeEnabled();

      await user.click(screen.getByRole('link', { name: 'Mapa' }));
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: 'Sair sem salvar',
        }),
      );
      await waitFor(() => expect(window.location.pathname).toBe('/mapa'));
    });

    it('com alterações, avisa ao fechar a página', async () => {
      mockEditor();
      const user = userEvent.setup();
      renderEditor();

      await botaoDoLote('1');
      await user.click(
        screen.getByRole('button', { name: 'arrastar circulo' }),
      );

      const evento = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(evento);

      expect(evento.defaultPrevented).toBe(true);
    });
  });

  it('sem planta ativa, mostra o caminho para as plantas', async () => {
    server.use(
      mswHttp.get('*/v1/mapa', () =>
        HttpResponse.json(
          makeErrorResponse({
            statusCode: 404,
            code: 'PLANTA_ATIVA_NAO_ENCONTRADA',
            message: 'Nenhuma planta ativa encontrada',
          }),
          { status: 404 },
        ),
      ),
    );

    renderEditor();

    expect(await screen.findByText('Nenhuma planta ativa')).toBeInTheDocument();
  });

  it('trata como sem planta uma ativa sem os metadados', async () => {
    mockEditor();
    server.use(
      http.get('/v1/mapa', ({ response }) =>
        response(200).json({
          planta: { ...PLANTA, maxZoom: null },
          marcadores: { data: [], meta: { ...META, total: 0 } },
        }),
      ),
    );

    renderEditor();

    expect(await screen.findByText('Nenhuma planta ativa')).toBeInTheDocument();
  });

  it('em uma falha, permite tentar de novo', async () => {
    server.use(
      mswHttp.get('*/v1/mapa', () =>
        HttpResponse.json(
          makeErrorResponse({
            statusCode: 500,
            code: 'ERRO_INTERNO',
            message: 'Internal server error',
          }),
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderEditor();

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    mockEditor();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await botaoDoLote('1')).toBeInTheDocument();
  });
});
