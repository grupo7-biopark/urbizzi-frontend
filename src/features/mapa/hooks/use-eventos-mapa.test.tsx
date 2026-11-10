import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventSourceFalso } from '@/test/event-source';
import type { MarcadorMapa, PlantaMapa } from '../api/mapa.api';
import { mapaKeys } from '../api/mapa.queries';
import {
  aplicarStatusNoMapa,
  lerStatusLote,
  useEventosMapa,
} from './use-eventos-mapa';
import type { ReactNode } from 'react';

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
    x: 0.5,
    y: 0.5,
    numero: '12',
    quadraId: '1c1b8f8e-5a52-4a8e-9d3f-2c7f1e5a9b10',
    quadra: 'A',
    loteamentoId: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    loteamento: 'Bela Vista',
    areaM2: '360.00',
    valor: '250000.00',
    status: 'DISPONIVEL',
    acoes: ['reservar'],
    ...overrides,
  };
}

function makeMapa(marcadores: MarcadorMapa[] = [makeMarcador()]) {
  return { planta: PLANTA, marcadores };
}

function renderComQueryClient(queryClient: QueryClient, children: ReactNode) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  EventSourceFalso.limpar();
  vi.stubGlobal('EventSource', EventSourceFalso);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('lerStatusLote', () => {
  it('aceita somente um lote e um status válidos', () => {
    expect(lerStatusLote({ loteId: 'lote-1', status: 'RESERVADO' })).toEqual({
      loteId: 'lote-1',
      status: 'RESERVADO',
    });
  });

  it('descarta payloads incompletos ou desconhecidos', () => {
    expect(lerStatusLote(null)).toBeNull();
    expect(lerStatusLote('texto')).toBeNull();
    expect(lerStatusLote({ status: 'RESERVADO' })).toBeNull();
    expect(lerStatusLote({ loteId: 'lote-1' })).toBeNull();
    expect(
      lerStatusLote({ loteId: 'lote-1', status: 'INDEFINIDO' }),
    ).toBeNull();
  });
});

describe('aplicarStatusNoMapa', () => {
  it('atualiza o marcador em todas as consultas e invalida o cache', () => {
    const queryClient = new QueryClient();
    const consulta = mapaKeys.consulta({});
    const comFiltro = mapaKeys.consulta({ status: ['RESERVADO'] });
    queryClient.setQueryData(consulta, makeMapa());
    queryClient.setQueryData(comFiltro, makeMapa());

    aplicarStatusNoMapa(queryClient, {
      loteId: '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
      status: 'RESERVADO',
    });

    for (const key of [consulta, comFiltro]) {
      expect(
        queryClient.getQueryData<ReturnType<typeof makeMapa>>(key)
          ?.marcadores[0]?.status,
      ).toBe('RESERVADO');
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });

  it('não inventa marcador nem quebra uma consulta ainda sem dados', () => {
    const queryClient = new QueryClient();
    const vazia = mapaKeys.consulta({ loteamentoId: 'x' });
    queryClient.getQueryCache().build(queryClient, { queryKey: vazia });

    aplicarStatusNoMapa(queryClient, {
      loteId: 'lote-inexistente',
      status: 'VENDIDO',
    });

    expect(queryClient.getQueryData(vazia)).toBeUndefined();
  });
});

describe('useEventosMapa', () => {
  it('aplica o status recebido no cache do mapa', () => {
    const queryClient = new QueryClient();
    const key = mapaKeys.consulta({});
    queryClient.setQueryData(key, makeMapa());
    const wrapper = ({ children }: { children: ReactNode }) =>
      renderComQueryClient(queryClient, children);

    const { result } = renderHook(() => useEventosMapa(), { wrapper });
    const fonte = EventSourceFalso.instancias[0]!;

    act(() => fonte.abrir());
    expect(result.current.estado).toBe('ao-vivo');

    act(() =>
      fonte.emitir('status-lote', {
        loteId: '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
        status: 'VENDIDO',
      }),
    );

    expect(
      queryClient.getQueryData<ReturnType<typeof makeMapa>>(key)?.marcadores[0]
        ?.status,
    ).toBe('VENDIDO');
  });

  it('avisa a composição para atualizar o detalhe do lote aberto', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(mapaKeys.consulta({}), makeMapa());
    const wrapper = ({ children }: { children: ReactNode }) =>
      renderComQueryClient(queryClient, children);
    const aoSincronizar = vi.fn<(loteId?: string) => void>();

    renderHook(() => useEventosMapa({ aoSincronizar }), { wrapper });
    const fonte = EventSourceFalso.instancias[0]!;

    act(() => fonte.abrir());
    act(() =>
      fonte.emitir('status-lote', {
        loteId: '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
        status: 'VENDIDO',
      }),
    );

    expect(aoSincronizar).toHaveBeenCalledWith(
      '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    );

    // A ressincronização pode ter perdido eventos de qualquer lote.
    act(() => fonte.emitir('ressincronizar'));
    expect(aoSincronizar).toHaveBeenLastCalledWith();
  });

  it('ignora eventos que não são de status', () => {
    const queryClient = new QueryClient();
    const key = mapaKeys.consulta({});
    queryClient.setQueryData(key, makeMapa());
    const wrapper = ({ children }: { children: ReactNode }) =>
      renderComQueryClient(queryClient, children);

    renderHook(() => useEventosMapa(), { wrapper });
    const fonte = EventSourceFalso.instancias[0]!;

    act(() => fonte.abrir());
    act(() => fonte.emitir('heartbeat'));
    act(() => fonte.emitir('status-lote', { loteId: 'lote-1' }));

    expect(
      queryClient.getQueryData<ReturnType<typeof makeMapa>>(key)?.marcadores[0]
        ?.status,
    ).toBe('DISPONIVEL');
  });

  it('invalida o mapa ao ressincronizar', () => {
    const queryClient = new QueryClient();
    const key = mapaKeys.consulta({});
    queryClient.setQueryData(key, makeMapa());
    const wrapper = ({ children }: { children: ReactNode }) =>
      renderComQueryClient(queryClient, children);

    renderHook(() => useEventosMapa(), { wrapper });
    const fonte = EventSourceFalso.instancias[0]!;

    act(() => fonte.abrir());
    act(() => fonte.emitir('ressincronizar'));

    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  });
});
