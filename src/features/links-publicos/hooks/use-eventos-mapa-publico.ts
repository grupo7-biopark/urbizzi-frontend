'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  lerStatusLote as lerStatusDoEvento,
  type EventoStatusLote as EventoStatusLoteGenerico,
} from '@/shared/api/eventos-sse';
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

export type EventoStatusLotePublico =
  EventoStatusLoteGenerico<StatusLotePublico>;

/** O evento público também traz só ids e status. */
export function lerStatusLotePublico(
  dados: unknown,
): EventoStatusLotePublico | null {
  return lerStatusDoEvento(dados, STATUS);
}

function aplicarStatus(
  dados: MapaPublico,
  loteId: string,
  status: StatusLotePublico,
): MapaPublico {
  return {
    ...dados,
    marcadores: {
      ...dados.marcadores,
      data: dados.marcadores.data.map((marcador) =>
        marcador.loteId === loteId ? { ...marcador, status } : marcador,
      ),
    },
  };
}

function aplicarPendentes(
  dados: MapaPublico,
  pendentes: ReadonlyMap<string, StatusLotePublico>,
): MapaPublico {
  let resultado = dados;

  for (const [loteId, status] of pendentes) {
    resultado = aplicarStatus(resultado, loteId, status);
  }

  return resultado;
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
  // Eventos recebidos enquanto o `router.refresh()` está em curso podem não
  // estar no snapshot que o servidor começou a montar; guardá-los evita perdê-los.
  const [pendentes, setPendentes] = useState(
    () => new Map<string, StatusLotePublico>(),
  );
  const [ressincronizando, setRessincronizando] = useState(false);

  // Quando o `router.refresh()` entrega dados novos, eles passam a valer; os
  // eventos recebidos antes disso não podem sobrescrever o servidor. O ajuste
  // no próprio render evita exibir o snapshot antigo por um quadro.
  if (origem !== dadosIniciais) {
    setOrigem(dadosIniciais);
    setDados(
      ressincronizando
        ? aplicarPendentes(dadosIniciais, pendentes)
        : dadosIniciais,
    );
    setPendentes(new Map());
    setRessincronizando(false);
  }

  const estado = useEventSource({
    url: `/api/publico/${encodeURIComponent(token)}/eventos`,
    eventos: ['ressincronizar', 'status-lote'],
    aoRessincronizar: () => {
      // A partir daqui, o snapshot pode ter sido lido antes dos próximos eventos.
      setPendentes(new Map());
      setRessincronizando(true);
      router.refresh();
    },
    aoEvento: (tipo, evento) => {
      if (tipo !== 'status-lote') return;
      const alteracao = lerStatusLotePublico(evento);
      if (!alteracao) return;

      if (ressincronizando) {
        setPendentes((atual) =>
          new Map(atual).set(alteracao.loteId, alteracao.status),
        );
      }
      setDados((atual) =>
        aplicarStatus(atual, alteracao.loteId, alteracao.status),
      );
    },
  });

  return { dados, estado };
}
