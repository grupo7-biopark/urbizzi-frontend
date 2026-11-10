import 'server-only';
import { getServerEnv } from '@/shared/config/env.server';

/**
 * Repassa o fluxo público sem sessão. A única credencial é o token do link, que
 * já veio na rota; nenhum cookie ou cabeçalho do navegador segue para a API.
 */
export async function observarEventosPublicos(
  token: string,
  signal?: AbortSignal,
) {
  try {
    const upstream = await fetch(
      new URL(
        `/v1/publico/${encodeURIComponent(token)}/eventos`,
        getServerEnv().API_URL,
      ),
      {
        headers: { accept: 'text/event-stream' },
        cache: 'no-store',
        redirect: 'error',
        signal,
      },
    );

    if (!upstream.ok || !upstream.body) {
      return new Response(null, {
        status: upstream.status === 404 ? 404 : 502,
      });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'Referrer-Policy': 'no-referrer',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
