import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';

export const API_UNAVAILABLE_CODE = 'API_INDISPONIVEL';
export const INVALID_ORIGIN_CODE = 'ORIGEM_INVALIDA';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Mesmo formato de erro da API, para o navegador tratar tudo como `ApiError`. */
export function bffError(
  request: NextRequest,
  statusCode: number,
  code: string,
  message: string,
) {
  return NextResponse.json(
    {
      statusCode,
      code,
      message,
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode, headers: { 'Cache-Control': 'no-store' } },
  );
}

export function apiUnavailable(request: NextRequest) {
  return bffError(
    request,
    502,
    API_UNAVAILABLE_CODE,
    'Serviço indisponível no momento',
  );
}

export function invalidOrigin(request: NextRequest) {
  return bffError(request, 403, INVALID_ORIGIN_CODE, 'Origem não permitida');
}

/** Repassa o erro da API; um corpo fora do formato não chega ao navegador. */
export function forwardApiError(
  request: NextRequest,
  status: number,
  body: unknown,
) {
  if (typeof body !== 'object' || body === null) {
    return apiUnavailable(request);
  }

  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * `SameSite=Lax` ajuda contra CSRF, mas Route Handlers não têm a checagem de
 * origem das Server Actions. Sem o header, recusa: navegadores sempre o enviam
 * em métodos que alteram dados.
 */
export function isAllowedOrigin(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) {
    return true;
  }

  const origin = request.headers.get('origin');
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ??
    request.headers.get('host');

  if (!origin || !host || !URL.canParse(origin)) {
    return false;
  }

  return new URL(origin).host === host;
}
