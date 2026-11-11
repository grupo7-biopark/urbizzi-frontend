'use client';

import { useEffect, useRef, useState } from 'react';
import { EVENTO_CONEXAO_ENCERRADA } from './eventos-sse';

/** Estado da conexão exibido ao lado do mapa. */
export type EstadoConexao =
  'conectando' | 'ao-vivo' | 'reconectando' | 'encerrado';

type OpcoesEventSource = {
  /** URL relativa do fluxo. `null` mantém a conexão desligada. */
  url: string | null;
  /** Eventos nomeados enviados pelo servidor, além de `message`. */
  eventos: readonly string[];
  /** Evento periódico que comprova que o fluxo continua vivo. */
  eventoHeartbeat?: string;
  /** Evento que encerra a assinatura, sem nova tentativa. */
  eventoEncerrado?: string;
  /** Recebe cada evento nomeado, com o JSON já interpretado. */
  aoEvento?: (tipo: string, dados: unknown) => void;
  /** Chamado a cada `ressincronizar`, inclusive no primeiro, como manda o contrato. */
  aoRessincronizar?: () => void;
};

const ESPERA_INICIAL_MS = 1000;
const ESPERA_MAXIMA_MS = 30_000;
// Uma conexão que não abre neste tempo conta como falha: a rede pode ter
// aceitado o TCP e travado antes de o servidor começar o fluxo.
const TEMPO_HANDSHAKE_MS = 10_000;
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
 * Assina um fluxo SSE nomeado, reconectando com espera crescente e jitter.
 *
 * O `EventSource` do navegador reconecta sozinho, mas sempre no mesmo intervalo
 * e sem limite. Fechar no erro e abrir de novo por conta própria permite a espera
 * exponencial e mantém o indicador de conexão coerente com o que está acontecendo.
 * O evento terminal vem do BFF quando a sessão ou o link deixaram de valer; nele,
 * não há nova tentativa.
 */
export function useEventSource({
  url,
  eventos,
  eventoHeartbeat = 'heartbeat',
  eventoEncerrado = EVENTO_CONEXAO_ENCERRADA,
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
    let encerrada = false;
    let espera: ReturnType<typeof setTimeout> | undefined;
    let vigia: ReturnType<typeof setTimeout> | undefined;
    let abertura: ReturnType<typeof setTimeout> | undefined;

    function limparVigia() {
      if (vigia !== undefined) {
        clearTimeout(vigia);
      }
    }

    function limparAbertura() {
      if (abertura !== undefined) {
        clearTimeout(abertura);
      }
    }

    function limparEspera() {
      if (espera !== undefined) {
        clearTimeout(espera);
      }
    }

    function agendarReconexao() {
      limparVigia();
      limparAbertura();
      limparEspera();
      if (signal.aborted || encerrada) return;
      setEstado('reconectando');
      const teto = Math.min(
        ESPERA_INICIAL_MS * 2 ** tentativa,
        ESPERA_MAXIMA_MS,
      );
      // Metade fixa e metade aleatória: clientes que caíram juntos não voltam juntos.
      const milissegundos = teto / 2 + Math.random() * (teto / 2);
      tentativa += 1;
      espera = setTimeout(conectar, milissegundos);
    }

    function acompanharSinal() {
      limparVigia();
      vigia = setTimeout(() => {
        if (signal.aborted || encerrada) return;
        fonte?.close();
        agendarReconexao();
      }, SEM_SINAL_MS);
    }

    function conectar() {
      if (signal.aborted || encerrada) return;
      fonte?.close();
      setEstado(tentativa === 0 ? 'conectando' : 'reconectando');

      const atual = new EventSource(endereco);
      fonte = atual;

      abertura = setTimeout(() => {
        if (signal.aborted || encerrada) return;
        if (atual.readyState === EventSource.OPEN) return;
        atual.close();
        agendarReconexao();
      }, TEMPO_HANDSHAKE_MS);

      atual.addEventListener('open', () => {
        if (signal.aborted || encerrada) return;
        limparAbertura();
        tentativa = 0;
        setEstado('ao-vivo');
        acompanharSinal();
      });

      atual.addEventListener('error', () => {
        if (signal.aborted || encerrada) return;
        limparAbertura();
        atual.close();
        agendarReconexao();
      });

      atual.addEventListener(eventoEncerrado, () => {
        if (signal.aborted) return;
        encerrada = true;
        limparAbertura();
        limparVigia();
        limparEspera();
        atual.close();
        setEstado('encerrado');
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
      limparEspera();
      limparVigia();
      limparAbertura();
    };
  }, [url, eventosChave, eventoHeartbeat, eventoEncerrado]);

  return url ? estado : 'conectando';
}
