import 'server-only';
import { getServerEnv } from '@/shared/config/env.server';
/** Só o recurso de imagem público, sem cookies, tokens ou cabeçalhos arbitrários. */
export async function getTilePublico({
  id,
  z,
  x,
  y,
}: {
  id: string;
  z: string;
  x: string;
  y: string;
}) {
  try {
    const upstream = await fetch(
      new URL(`/v1/plantas/${id}/tiles/${z}/${x}/${y}`, getServerEnv().API_URL),
      { cache: 'no-store', redirect: 'error' },
    );
    if (!upstream.ok)
      return new Response(null, {
        status: upstream.status === 404 ? 404 : 502,
      });
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
