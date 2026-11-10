import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { components } from '@/shared/api/schema';
import { EventSourceFalso } from '@/test/event-source';
import { MapaPublico } from './mapa-publico';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn<() => void>() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

vi.mock('@/shared/ui/visualizador-planta', () => ({
  VisualizadorPlanta: () => <div data-testid="visualizador" />,
}));

const TOKEN = 'a'.repeat(43);

const DADOS: components['schemas']['MapaPublicoDto'] = {
  planta: {
    id: '7a3e5b2c-8a52-4a8e-9d3f-2c7f1e5a9b10',
    nome: 'Masterplan',
    versao: 1,
    larguraPx: 256,
    alturaPx: 256,
    maxZoom: 0,
    tamanhoTile: 256,
    tilesUrl: '/tiles',
  },
  marcadores: {
    data: [
      {
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
        status: 'DISPONIVEL',
      },
    ],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  },
  contatoComercial: 'Fale com a equipe que compartilhou este mapa.',
};

beforeEach(() => {
  EventSourceFalso.limpar();
  vi.stubGlobal('EventSource', EventSourceFalso);
  refresh.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MapaPublico em tempo real', () => {
  it('assina o fluxo do token e atualiza o status do lote', () => {
    render(<MapaPublico dados={DADOS} token={TOKEN} />);

    expect(screen.getByText('Conectando…')).toBeInTheDocument();

    const fonte = EventSourceFalso.instancias[0]!;
    expect(fonte.url).toBe(`/api/publico/${TOKEN}/eventos`);

    act(() => fonte.abrir());
    expect(screen.getByText('Ao vivo')).toBeInTheDocument();

    act(() =>
      fonte.emitir('status-lote', {
        loteId: '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
        status: 'RESERVADO',
      }),
    );

    expect(screen.getByText('Reservado', { exact: true })).toBeInTheDocument();
  });

  it('recarrega do servidor ao ressincronizar', () => {
    render(<MapaPublico dados={DADOS} token={TOKEN} />);

    const fonte = EventSourceFalso.instancias[0]!;
    act(() => fonte.abrir());
    act(() => fonte.emitir('ressincronizar'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('aceita os dados novos que o servidor entrega', () => {
    const { rerender } = render(<MapaPublico dados={DADOS} token={TOKEN} />);
    const fonte = EventSourceFalso.instancias[0]!;
    act(() => fonte.abrir());
    act(() =>
      fonte.emitir('status-lote', {
        loteId: '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
        status: 'BLOQUEADO',
      }),
    );

    rerender(
      <MapaPublico
        token={TOKEN}
        dados={{
          ...DADOS,
          marcadores: {
            ...DADOS.marcadores,
            data: [{ ...DADOS.marcadores.data[0]!, status: 'VENDIDO' }],
          },
        }}
      />,
    );

    expect(screen.getByText('Vendido', { exact: true })).toBeInTheDocument();
  });

  it('ignora eventos desconhecidos ou fora do contrato', () => {
    render(<MapaPublico dados={DADOS} token={TOKEN} />);
    const fonte = EventSourceFalso.instancias[0]!;
    act(() => fonte.abrir());

    act(() => fonte.emitir('heartbeat'));
    act(() => fonte.emitir('status-lote', { status: 'RESERVADO' }));

    expect(screen.getByText('Disponível', { exact: true })).toBeInTheDocument();
  });
});
