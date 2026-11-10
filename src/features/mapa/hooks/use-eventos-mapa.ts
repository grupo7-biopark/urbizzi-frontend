'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
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

export type EventoStatusLote = {
  loteId: string;
  status: StatusLoteMapa;
};

type MapaCarregado = Awaited<ReturnType<typeof getMapa>>;

/** O evento traz só ids e status; qualquer outra coisa é descartada. */
export function lerStatusLote(dados: unknown): EventoStatusLote | null {
  if (typeof dados !== 'object' || dados === null) {
    return null;
  }

  const { loteId, status } = dados as { loteId?: unknown; status?: unknown };

  if (
    typeof loteId !== 'string' ||
    !STATUS.includes(status as StatusLoteMapa)
  ) {
    return null;
  }

  return { loteId, status: status as StatusLoteMapa };
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

/** Mantém o mapa interno em dia com as mudanças confirmadas por outras sessões. */
export function useEventosMapa() {
  const queryClient = useQueryClient();

  const estado = useEventSource({
    url: URL_EVENTOS,
    eventos: EVENTOS,
    aoRessincronizar: () => {
      void queryClient.invalidateQueries({ queryKey: mapaKeys.consultas() });
    },
    aoEvento: (tipo, dados) => {
      if (tipo !== 'status-lote') return;
      const evento = lerStatusLote(dados);
      if (evento) {
        aplicarStatusNoMapa(queryClient, evento);
      }
    },
  });

  return { estado };
}
