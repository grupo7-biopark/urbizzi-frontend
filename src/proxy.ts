import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  CURRENT_PATH_HEADER,
  getLoginPath,
  getSafeRedirect,
  LOGIN_PATH,
  REFRESH_COOKIE,
} from '@/shared/auth/session-paths';

// Abertas com ou sem sessão. As telas de senha são entregues na FE-09, e o
// catálogo responde 404 em produção.
const PUBLIC_PATHS = new Set([
  '/design-system',
  '/recuperar-senha',
  '/redefinir-senha',
  '/sessao-indisponivel',
]);

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}

/**
 * Checagem otimista: lê só o cookie, sem chamar a API. Quem confere a sessão de
 * verdade é o layout de `(app)` (docs/security.md).
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const hasSession =
    request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);

  if (pathname === LOGIN_PATH) {
    return hasSession
      ? redirectTo(request, getSafeRedirect(searchParams.get('redirect')))
      : NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const currentPath = `${pathname}${search}`;

  if (!hasSession) {
    return redirectTo(request, getLoginPath(currentPath));
  }

  // Sobrescreve o valor que o navegador tenha enviado nesse header.
  const headers = new Headers(request.headers);
  headers.set(CURRENT_PATH_HEADER, currentPath);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Rotas de API respondem 401, sem redirecionar. A página pública não usa sessão.
  matcher: [
    '/((?!api/|_next/static|_next/image|brand/|p/|favicon\\.ico|.*\\.\\w+$).*)',
  ],
};
