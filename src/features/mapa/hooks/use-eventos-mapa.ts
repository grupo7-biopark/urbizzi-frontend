'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  lerStatusLote as lerStatusDoEvento,
  type EventoStatusLote as EventoStatusLoteGenerico,
} from '@/shared/api/eventos-sse';
import { useEventSource } from '@/shared/api/use-event-source';
import { getMapa, type StatusLoteMapa } from '../api/mapa.api';
import { mapaKeys } from '../api/mapa.queries';

const URL_EVENTOS = '/api/backend/v1/mapa/eventos';
const EVENTOS = ['ressincronizar', 'status-lote'] as const;
const STATUS: readonly StatusLoteMapa[] = [
  'DISPONIVEL',
  'RESERVADO',
  'VENDIDO',
  'BLOQUEADO',
];

export type EventoStatusLote = EventoStatusLoteGenerico<StatusLoteMapa>;

type MapaCarregado = Awaited<ReturnType<typeof getMapa>>;

export function lerStatusLote(dados: unknown): EventoStatusLote | null {
  return lerStatusDoEvento(dados, STATUS);
}

/**
 * Atualiza o cache na hora, para a cor mudar sem esperar a rede, e invalida em
 * seguida: o status muda as ações do lote e pode incluí-lo ou tirá-lo do filtro.
 */
export function aplicarStatusNoMapa(
  queryClient: QueryClient,
  evento: EventoStatusLote,
) {
  queryClient.setQueriesData<MapaCarregado>(
    { queryKey: mapaKeys.consultas() },
    (atual) =>
      atual
        ? {
            ...atual,
            marcadores: atual.marcadores.map((marcador) =>
              marcador.loteId === evento.loteId
                ? { ...marcador, status: evento.status }
                : marcador,
            ),
          }
        : atual,
  );

  void queryClient.invalidateQueries({ queryKey: mapaKeys.consultas() });
}

type OpcoesEventosMapa = {
  /**
   * Avisa a composição, que pode atualizar dados de outra funcionalidade, como
   * o detalhe do lote aberto na gaveta. Sem o lote, a mudança pode ser em qualquer um.
   */
  aoSincronizar?: (loteId?: string) => void;
};

/** Mantém o mapa interno em dia com as mudanças confirmadas por outras sessões. */
export function useEventosMapa({ aoSincronizar }: OpcoesEventosMapa = {}) {
  const queryClient = useQueryClient();

  const estado = useEventSource({
    url: URL_EVENTOS,
    eventos: EVENTOS,
    aoRessincronizar: () => {
      void queryClient.invalidateQueries({ queryKey: mapaKeys.consultas() });
      aoSincronizar?.();
    },
    aoEvento: (tipo, dados) => {
      if (tipo !== 'status-lote') return;
      const evento = lerStatusLote(dados);
      if (evento) {
        aplicarStatusNoMapa(queryClient, evento);
        aoSincronizar?.(evento.loteId);
      }
    },
  });

  return { estado };
}
