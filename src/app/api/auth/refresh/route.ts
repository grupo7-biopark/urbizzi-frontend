import { NextResponse, type NextRequest } from 'next/server';
import { refreshSession } from '@/shared/auth/refresh.server';
import {
  getLoginPath,
  getSafeRedirect,
  getSessionUnavailablePath,
} from '@/shared/auth/session-paths';
import {
  clearSessionCookies,
  readSessionCookies,
  writeSessionCookies,
} from '@/shared/auth/session.server';

function redirectTo(location: string) {
  // Caminho relativo: atrás de um proxy reverso, `request.url` pode ter o host interno.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location, 'Cache-Control': 'no-store' },
  });
}

/**
 * Destino de quem abre uma página com o access token vencido: renova e volta,
 * porque Server Components não gravam cookies. Sem refresh válido, encerra a
 * sessão e leva ao login.
 */
export async function GET(request: NextRequest) {
  const target = getSafeRedirect(request.nextUrl.searchParams.get('redirect'));
  const { refreshToken } = readSessionCookies(request);
  const result = refreshToken ? await refreshSession(refreshToken) : null;

  if (result?.outcome === 'renewed') {
    const response = redirectTo(target);
    writeSessionCookies(response, result.tokens);
    return response;
  }

  // Falha temporária não encerra a sessão, e voltar ao login criaria um ciclo:
  // com o cookie ainda presente, o `src/proxy.ts` tiraria o usuário de lá.
  if (result?.outcome === 'unavailable') {
    return redirectTo(getSessionUnavailablePath(target));
  }

  const response = redirectTo(getLoginPath(target));
  clearSessionCookies(response);
  return response;
}
