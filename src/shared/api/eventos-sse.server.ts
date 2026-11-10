import { NextResponse } from 'next/server';
import {
  EVENTO_CONEXAO_ENCERRADA,
  type MotivoEncerramento,
} from './eventos-sse';

/**
 * Encerra a assinatura pelo próprio fluxo. Um `401` ou `404` faria o
 * `EventSource` reconectar para sempre; um `200` com o evento terminal deixa o
 * cliente saber que o motivo é definitivo.
 */
export function respostaConexaoEncerrada(motivo: MotivoEncerramento) {
  return new NextResponse(
    `event: ${EVENTO_CONEXAO_ENCERRADA}\ndata: ${JSON.stringify({ motivo })}\n\n`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
