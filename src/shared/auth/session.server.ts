import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
import type { components } from '@/shared/api/schema';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './session-paths';

export type SessionTokens = components['schemas']['TokensDto'];

// A API não informa a validade do refresh token: este é o padrão dela. Se o
// cookie durar mais que o token, quem decide é a API, ao recusar a renovação.
const REFRESH_COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60;

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    // Só o desenvolvimento em HTTP dispensa `Secure` (docs/security.md).
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge,
  } as const;
}

export function readSessionCookies(request: NextRequest) {
  return {
    accessToken: request.cookies.get(ACCESS_COOKIE)?.value,
    refreshToken: request.cookies.get(REFRESH_COOKIE)?.value,
  };
}

export function writeSessionCookies(
  response: NextResponse,
  tokens: SessionTokens,
) {
  response.cookies.set(
    ACCESS_COOKIE,
    tokens.accessToken,
    getCookieOptions(tokens.expiresIn),
  );
  response.cookies.set(
    REFRESH_COOKIE,
    tokens.refreshToken,
    getCookieOptions(REFRESH_COOKIE_MAX_AGE_S),
  );
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, '', getCookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, '', getCookieOptions(0));
}
