import { unwrap } from './request';

// Mesmo motivo de `client.ts`: o `Request` do Node não aceita URL relativa.
const origin = typeof window === 'undefined' ? '' : window.location.origin;

async function send(path: string, body?: unknown) {
  const response = await globalThis.fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const error: unknown = response.ok
    ? undefined
    : await response.json().catch(() => undefined);

  return { data: undefined, error, response };
}

/** Rotas do próprio Next (`/api/auth`), que ficam fora do schema da API. */
export function postBff(path: string, body?: unknown) {
  return unwrap(send(path, body));
}
