import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventSourceFalso } from '@/test/event-source';
import { useEventSource } from './use-event-source';

const EVENTOS = ['ressincronizar', 'status-lote'] as const;

beforeEach(() => {
  vi.useFakeTimers();
  EventSourceFalso.limpar();
  vi.stubGlobal('EventSource', EventSourceFalso);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useEventSource', () => {
  it('conecta, fica ao vivo e entrega os eventos nomeados', () => {
    const aoEvento = vi.fn<(tipo: string, dados: unknown) => void>();
    const { result } = renderHook(() =>
      useEventSource({ url: '/api/eventos', eventos: EVENTOS, aoEvento }),
    );

    expect(EventSourceFalso.instancias).toHaveLength(1);
    expect(EventSourceFalso.instancias[0]?.url).toBe('/api/eventos');
    expect(result.current).toBe('conectando');

    const fonte = EventSourceFalso.instancias[0]!;
    act(() => fonte.abrir());
    expect(result.current).toBe('ao-vivo');

    act(() =>
      fonte.emitir('status-lote', { loteId: 'lote-1', status: 'RESERVADO' }),
    );
    expect(aoEvento).toHaveBeenCalledWith('status-lote', {
      loteId: 'lote-1',
      status: 'RESERVADO',
    });
  });

  it('chama o retorno de ressincronização, inclusive com dados vazios', () => {
    const aoRessincronizar = vi.fn<() => void>();
    renderHook(() =>
      useEventSource({
        url: '/api/eventos',
        eventos: EVENTOS,
        aoRessincronizar,
      }),
    );

    const fonte = EventSourceFalso.instancias[0]!;
    act(() => fonte.abrir());
    act(() => fonte.emitir('ressincronizar'));

    expect(aoRessincronizar).toHaveBeenCalledTimes(1);
  });

  it('entrega `null` quando o evento não é JSON válido', () => {
    const aoEvento = vi.fn<(tipo: string, dados: unknown) => void>();
    renderHook(() =>
      useEventSource({ url: '/api/eventos', eventos: EVENTOS, aoEvento }),
    );

    const fonte = EventSourceFalso.instancias[0]!;
    act(() => fonte.abrir());
    act(() => fonte.emitirBruto('status-lote', '{'));

    expect(aoEvento).toHaveBeenLastCalledWith('status-lote', null);
  });

  it('reconecta com espera crescente e zera a espera depois de abrir', () => {
    const { result } = renderHook(() =>
      useEventSource({ url: '/api/eventos', eventos: EVENTOS }),
    );

    act(() => EventSourceFalso.instancias[0]!.abrir());
    act(() => EventSourceFalso.instancias[0]!.falhar());

    expect(result.current).toBe('reconectando');
    expect(EventSourceFalso.instancias).toHaveLength(1);

    act(() => vi.advanceTimersByTime(999));
    expect(EventSourceFalso.instancias).toHaveLength(1);

    act(() => vi.advanceTimersByTime(1));
    expect(EventSourceFalso.instancias).toHaveLength(2);

    // Falhou de novo antes de abrir: a espera dobra para 2 s.
    act(() => EventSourceFalso.instancias[1]!.falhar());
    act(() => vi.advanceTimersByTime(1999));
    expect(EventSourceFalso.instancias).toHaveLength(2);

    act(() => vi.advanceTimersByTime(1));
    expect(EventSourceFalso.instancias).toHaveLength(3);

    // Abriu: a próxima queda volta à espera inicial.
    act(() => EventSourceFalso.instancias[2]!.abrir());
    expect(result.current).toBe('ao-vivo');
    act(() => EventSourceFalso.instancias[2]!.falhar());
    act(() => vi.advanceTimersByTime(1000));
    expect(EventSourceFalso.instancias).toHaveLength(4);
  });

  it('reconecta quando o fluxo fica sem sinal', () => {
    const { result } = renderHook(() =>
      useEventSource({ url: '/api/eventos', eventos: EVENTOS }),
    );

    act(() => EventSourceFalso.instancias[0]!.abrir());
    act(() => vi.advanceTimersByTime(39_999));
    expect(EventSourceFalso.instancias).toHaveLength(1);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('reconectando');

    act(() => vi.advanceTimersByTime(1000));
    expect(EventSourceFalso.instancias).toHaveLength(2);
  });

  it('um evento reinicia o vigia de silêncio', () => {
    renderHook(() => useEventSource({ url: '/api/eventos', eventos: EVENTOS }));

    const fonte = EventSourceFalso.instancias[0]!;
    act(() => fonte.abrir());
    act(() => vi.advanceTimersByTime(30_000));
    act(() => fonte.emitir('heartbeat'));

    act(() => vi.advanceTimersByTime(30_000));
    expect(EventSourceFalso.instancias).toHaveLength(1);

    act(() => vi.advanceTimersByTime(10_000));
    expect(EventSourceFalso.instancias).toHaveLength(1);

    act(() => vi.advanceTimersByTime(1000));
    expect(EventSourceFalso.instancias).toHaveLength(2);
  });

  it('fecha a conexão e cancela a reconexão ao desmontar', () => {
    const { unmount } = renderHook(() =>
      useEventSource({ url: '/api/eventos', eventos: EVENTOS }),
    );

    const fonte = EventSourceFalso.instancias[0]!;
    act(() => fonte.abrir());
    act(() => fonte.falhar());
    unmount();

    expect(fonte.fechado).toBe(true);
    act(() => vi.advanceTimersByTime(60_000));
    expect(EventSourceFalso.instancias).toHaveLength(1);
  });

  it('não conecta sem URL', () => {
    const { result } = renderHook(() =>
      useEventSource({ url: null, eventos: EVENTOS }),
    );

    expect(EventSourceFalso.instancias).toHaveLength(0);
    expect(result.current).toBe('conectando');
  });
});
