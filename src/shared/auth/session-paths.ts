export const ACCESS_COOKIE = 'urbizzi_access';
export const REFRESH_COOKIE = 'urbizzi_refresh';

/** Preenchido pelo `src/proxy.ts`, porque um layout não sabe qual é a rota atual. */
export const CURRENT_PATH_HEADER = 'x-urbizzi-path';

export const LOGIN_PATH = '/login';
export const DEFAULT_PATH = '/';

/**
 * Aceita só caminho interno, para evitar redirecionamento aberto. Passa pelo
 * `URL` porque o navegador ignora tabulação e quebra de linha: `/\t/site.com`
 * começa com uma barra só, mas leva a outro site.
 */
export function getSafeRedirect(value: unknown) {
  const base = 'http://urbizzi.invalid';

  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    !URL.canParse(value, base)
  ) {
    return DEFAULT_PATH;
  }

  const url = new URL(value, base);

  // Voltar para o login depois de entrar criaria um ciclo de redirecionamentos.
  if (url.origin !== base || url.pathname === LOGIN_PATH) {
    return DEFAULT_PATH;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function withRedirect(path: string, target: string) {
  return target === DEFAULT_PATH
    ? path
    : `${path}?redirect=${encodeURIComponent(target)}`;
}

export function getLoginPath(target: string) {
  return withRedirect(LOGIN_PATH, target);
}

export function getRefreshPath(target: string) {
  return withRedirect('/api/auth/refresh', target);
}

export function getSessionUnavailablePath(target: string) {
  return withRedirect('/sessao-indisponivel', target);
}
