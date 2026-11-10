'use client';

import { useEffect, useRef, useState } from 'react';

/** Estado da conexão exibido ao lado do mapa. */
export type EstadoConexao = 'conectando' | 'ao-vivo' | 'reconectando';

type OpcoesEventSource = {
  /** URL relativa do fluxo. `null` mantém a conexão desligada. */
  url: string | null;
  /** Eventos nomeados enviados pelo servidor, além de `message`. */
  eventos: readonly string[];
  /** Evento periódico que comprova que o fluxo continua vivo. */
  eventoHeartbeat?: string;
  /** Recebe cada evento nomeado, com o JSON já interpretado. */
  aoEvento?: (tipo: string, dados: unknown) => void;
  /** Chamado a cada `ressincronizar`, inclusive no primeiro, como manda o contrato. */
  aoRessincronizar?: () => void;
};

const ESPERA_INICIAL_MS = 1000;
const ESPERA_MAXIMA_MS = 30_000;
// O backend envia heartbeat a cada 15 s. Sem nenhum evento por este tempo, a
// conexão pode estar morta sem o navegador ter disparado `error`.
const SEM_SINAL_MS = 40_000;

function lerDados(evento: Event): unknown {
  if (!('data' in evento) || typeof evento.data !== 'string') {
    return null;
  }

  try {
    return JSON.parse(evento.data);
  } catch {
    return null;
  }
}

/**
 * Assina um fluxo SSE nomeado, reconectando com espera crescente.
 *
 * O `EventSource` do navegador reconecta sozinho, mas sempre no mesmo intervalo
 * e sem limite. Fechar no erro e abrir de novo por conta própria permite a espera
 * exponencial e mantém o indicador de conexão coerente com o que está acontecendo.
 */
export function useEventSource({
  url,
  eventos,
  eventoHeartbeat = 'heartbeat',
  aoEvento,
  aoRessincronizar,
}: OpcoesEventSource) {
  const [estado, setEstado] = useState<EstadoConexao>('conectando');
  const retornos = useRef({ aoEvento, aoRessincronizar });

  useEffect(() => {
    retornos.current = { aoEvento, aoRessincronizar };
  }, [aoEvento, aoRessincronizar]);

  const eventosChave = eventos.join(' ');

  useEffect(() => {
    if (!url || typeof EventSource === 'undefined') {
      return;
    }

    const endereco = url;
    const tipos = eventosChave ? eventosChave.split(' ') : [];
    const controle = new AbortController();
    const { signal } = controle;
    let fonte: EventSource | undefined;
    let tentativa = 0;
    let espera: ReturnType<typeof setTimeout> | undefined;
    let vigia: ReturnType<typeof setTimeout> | undefined;

    function limparVigia() {
      if (vigia !== undefined) {
        clearTimeout(vigia);
      }
    }

    function agendarReconexao() {
      limparVigia();
      if (signal.aborted) return;
      setEstado('reconectando');
      const milissegundos = Math.min(
        ESPERA_INICIAL_MS * 2 ** tentativa,
        ESPERA_MAXIMA_MS,
      );
      tentativa += 1;
      espera = setTimeout(conectar, milissegundos);
    }

    function acompanharSinal() {
      limparVigia();
      vigia = setTimeout(() => {
        if (signal.aborted) return;
        fonte?.close();
        agendarReconexao();
      }, SEM_SINAL_MS);
    }

    function conectar() {
      if (signal.aborted) return;
      fonte?.close();
      setEstado(tentativa === 0 ? 'conectando' : 'reconectando');

      const atual = new EventSource(endereco);
      fonte = atual;

      atual.addEventListener('open', () => {
        if (signal.aborted) return;
        tentativa = 0;
        setEstado('ao-vivo');
        acompanharSinal();
      });

      atual.addEventListener('error', () => {
        if (signal.aborted) return;
        atual.close();
        agendarReconexao();
      });

      for (const tipo of tipos) {
        atual.addEventListener(tipo, (evento) => {
          if (signal.aborted) return;
          acompanharSinal();
          if (tipo === 'ressincronizar') {
            retornos.current.aoRessincronizar?.();
          }
          retornos.current.aoEvento?.(tipo, lerDados(evento));
        });
      }

      atual.addEventListener(eventoHeartbeat, () => {
        if (!signal.aborted) {
          acompanharSinal();
        }
      });
    }

    conectar();

    return () => {
      controle.abort();
      fonte?.close();
      clearTimeout(espera);
      limparVigia();
    };
  }, [url, eventosChave, eventoHeartbeat]);

  return url ? estado : 'conectando';
}
