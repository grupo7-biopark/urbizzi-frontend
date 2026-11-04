import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { getServerEnv } from '@/shared/config/env.server';
import {
  apiUnavailable,
  bffError,
  forwardApiError,
  invalidOrigin,
  isAllowedOrigin,
} from './bff-response.server';
import { refreshSession, type RefreshResult } from './refresh.server';
import {
  clearSessionCookies,
  readSessionCookies,
  writeSessionCookies,
  type SessionTokens,
} from './session.server';

// Estas rotas devolvem ou consomem tokens, que nunca podem chegar ao JavaScript
// do navegador. O login e o logout têm rotas próprias em /api/auth.
const BLOCKED_PATHS = new Set([
  '/v1/auth/login',
  '/v1/auth/refresh',
  '/v1/auth/logout',
]);

const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'content-type',
  'if-modified-since',
  'if-none-match',
  'range',
];

// `fetch` já descomprime o corpo, então os tamanhos e a codificação originais
// deixam de valer. `Set-Cookie` da API nunca chega ao navegador.
const DROPPED_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'set-cookie',
  'transfer-encoding',
]);

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

// O corpo fica em memória para poder reenviar depois de renovar a sessão. Acima
// disso (a planta aceita 300 MB) ele segue em fluxo, sem reenvio.
const MAX_BUFFERED_BODY_BYTES = 10 * 1024 * 1024;

function getTargetUrl(segments: string[], search: string) {
  // Só encaminha para `/v1/...` em `API_URL`, nunca para uma URL vinda da
  // requisição (SSRF). Cada segmento é codificado para não escapar do caminho.
  const isInvalid =
    segments[0] !== 'v1' ||
    segments.some((part) => part === '' || part === '.' || part === '..');

  if (isInvalid) {
    return null;
  }

  const pathname = `/${segments.map(encodeURIComponent).join('/')}`;

  // A API não diferencia maiúsculas nas rotas.
  if (BLOCKED_PATHS.has(pathname.toLowerCase())) {
    return null;
  }

  return new URL(`${pathname}${search}`, getServerEnv().API_URL);
}

function getForwardedHeaders(request: NextRequest, accessToken?: string) {
  const headers = new Headers();

  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

function canBufferBody(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);

  return contentLength <= MAX_BUFFERED_BODY_BYTES;
}

async function getBody(request: NextRequest) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  if (!canBufferBody(request)) {
    return request.body ?? undefined;
  }

  const buffer = await request.arrayBuffer();

  return buffer.byteLength > 0 ? buffer : undefined;
}

function toResponse(upstream: Response) {
  const headers = new Headers();

  upstream.headers.forEach((value, name) => {
    if (!DROPPED_RESPONSE_HEADERS.has(name)) {
      headers.set(name, value);
    }
  });

  if (!headers.has('cache-control')) {
    headers.set('cache-control', 'no-store');
  }

  return new NextResponse(
    NULL_BODY_STATUSES.has(upstream.status) ? null : upstream.body,
    { status: upstream.status, headers },
  );
}

/** Outros `401` da API, como o de token de recuperação, não dizem respeito à sessão. */
async function isSessionRejected(upstream: Response) {
  if (upstream.status !== 401) {
    return false;
  }

  const body: unknown = await upstream
    .clone()
    .json()
    .catch(() => undefined);

  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { code?: unknown }).code === 'NAO_AUTENTICADO'
  );
}

function fromFailedRefresh(
  request: NextRequest,
  result: Exclude<RefreshResult, { outcome: 'renewed' }>,
) {
  const response = forwardApiError(request, result.status, result.body);

  if (result.outcome === 'rejected') {
    clearSessionCookies(response);
  }

  return response;
}

/** Repassa a requisição à API com o token, renovando a sessão uma vez no `401`. */
export async function proxyToBackend(request: NextRequest, segments: string[]) {
  if (!isAllowedOrigin(request)) {
    return invalidOrigin(request);
  }

  const target = getTargetUrl(segments, request.nextUrl.search);

  if (!target) {
    return bffError(
      request,
      404,
      'RECURSO_NAO_ENCONTRADO',
      'Recurso não encontrado',
    );
  }

  const { accessToken, refreshToken } = readSessionCookies(request);
  const canRetry = canBufferBody(request);

  try {
    const body = await getBody(request);

    const send = (token?: string) =>
      fetch(target, {
        method: request.method,
        headers: getForwardedHeaders(request, token),
        body,
        cache: 'no-store',
        redirect: 'manual',
        signal: request.signal,
        // Exigido pelo `fetch` do Node para enviar o corpo em fluxo.
        ...(canRetry ? {} : { duplex: 'half' }),
      } as RequestInit);

    let renewedTokens: SessionTokens | undefined;

    // O cookie do access token expira junto com ele: nada a enviar, renova antes.
    if (!accessToken && refreshToken) {
      const result = await refreshSession(refreshToken);

      if (result.outcome !== 'renewed') {
        return fromFailedRefresh(request, result);
      }

      renewedTokens = result.tokens;
    }

    let upstream = await send(renewedTokens?.accessToken ?? accessToken);
    let isSessionOver = false;

    if (await isSessionRejected(upstream)) {
      if (!refreshToken || renewedTokens) {
        isSessionOver = true;
      } else {
        const result = await refreshSession(refreshToken);

        if (result.outcome !== 'renewed') {
          return fromFailedRefresh(request, result);
        }

        renewedTokens = result.tokens;

        // Sem reenvio, a resposta segue como `401` e a sessão já fica renovada
        // para a próxima tentativa.
        if (canRetry) {
          upstream = await send(renewedTokens.accessToken);
          isSessionOver = await isSessionRejected(upstream);
        }
      }
    }

    const response = toResponse(upstream);

    if (isSessionOver) {
      clearSessionCookies(response);
    } else if (renewedTokens) {
      writeSessionCookies(response, renewedTokens);
    }

    return response;
  } catch {
    return apiUnavailable(request);
  }
}
