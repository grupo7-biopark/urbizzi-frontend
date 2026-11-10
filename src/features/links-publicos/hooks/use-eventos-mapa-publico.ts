'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { components } from '@/shared/api/schema';
import { useEventSource } from '@/shared/api/use-event-source';

type MapaPublico = components['schemas']['MapaPublicoDto'];
type StatusLotePublico = components['schemas']['LotePublicoDto']['status'];

const STATUS: readonly StatusLotePublico[] = [
  'DISPONIVEL',
  'RESERVADO',
  'VENDIDO',
  'BLOQUEADO',
];

export type EventoStatusLotePublico = {
  loteId: string;
  status: StatusLotePublico;
};

/** O evento público também traz só ids e status. */
export function lerStatusLotePublico(
  dados: unknown,
): EventoStatusLotePublico | null {
  if (typeof dados !== 'object' || dados === null) {
    return null;
  }

  const { loteId, status } = dados as { loteId?: unknown; status?: unknown };

  if (
    typeof loteId !== 'string' ||
    !STATUS.includes(status as StatusLotePublico)
  ) {
    return null;
  }

  return { loteId, status: status as StatusLotePublico };
}

/**
 * O link público não tem cache do TanStack Query: os dados vêm do Server
 * Component. O evento atualiza os marcadores em memória e a ressincronização
 * pede uma nova renderização do servidor, que relê o mapa inteiro.
 */
export function useEventosMapaPublico(
  token: string,
  dadosIniciais: MapaPublico,
) {
  const router = useRouter();
  const [dados, setDados] = useState(dadosIniciais);
  const [origem, setOrigem] = useState(dadosIniciais);

  // Quando o `router.refresh()` entrega dados novos, eles passam a valer; os
  // eventos recebidos antes disso não podem sobrescrever o servidor.
  if (origem !== dadosIniciais) {
    setOrigem(dadosIniciais);
    setDados(dadosIniciais);
  }

  const estado = useEventSource({
    url: `/api/publico/${encodeURIComponent(token)}/eventos`,
    eventos: ['ressincronizar', 'status-lote'],
    aoRessincronizar: () => router.refresh(),
    aoEvento: (tipo, evento) => {
      if (tipo !== 'status-lote') return;
      const alteracao = lerStatusLotePublico(evento);
      if (!alteracao) return;

      setDados((atual) => ({
        ...atual,
        marcadores: {
          ...atual.marcadores,
          data: atual.marcadores.data.map((marcador) =>
            marcador.loteId === alteracao.loteId
              ? { ...marcador, status: alteracao.status }
              : marcador,
          ),
        },
      }));
    },
  });

  return { dados, estado };
}
