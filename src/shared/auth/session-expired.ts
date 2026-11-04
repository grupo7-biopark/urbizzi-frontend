import { ApiError } from '@/shared/api/errors';
import { navigateTo } from './navigation';
import { getLoginPath } from './session-paths';

// `CREDENCIAIS_INVALIDAS` também é um 401, mas é o resultado esperado do login.
const SESSION_EXPIRED_CODES = new Set([
  'NAO_AUTENTICADO',
  'REFRESH_TOKEN_INVALIDO',
]);

/** Com a sessão perdida no meio do uso, leva ao login preservando a página. */
export function handleSessionExpired(error: unknown) {
  if (
    typeof window === 'undefined' ||
    !(error instanceof ApiError) ||
    !SESSION_EXPIRED_CODES.has(error.code)
  ) {
    return;
  }

  const { pathname, search } = window.location;
  navigateTo(getLoginPath(`${pathname}${search}`));
}
