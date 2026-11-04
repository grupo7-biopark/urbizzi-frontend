import { NextResponse, type NextRequest } from 'next/server';
import { getServerApi } from '@/shared/api/client.server';
import {
  invalidOrigin,
  isAllowedOrigin,
} from '@/shared/auth/bff-response.server';
import {
  clearSessionCookies,
  readSessionCookies,
} from '@/shared/auth/session.server';

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return invalidOrigin(request);
  }

  const { refreshToken } = readSessionCookies(request);

  if (refreshToken) {
    // Falhar ao revogar não pode prender o usuário na sessão: os cookies saem
    // de qualquer forma, e o token expira sozinho na API.
    await getServerApi()
      .POST('/v1/auth/logout', { body: { refreshToken } })
      .catch(() => undefined);
  }

  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response);

  return response;
}
