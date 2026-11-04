import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiErrorFromResponse } from '@/shared/api/errors';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { navigateTo } from './navigation';
import { handleSessionExpired } from './session-expired';

vi.mock('./navigation', () => ({ navigateTo: vi.fn<() => void>() }));

function apiError(status: number, code: string) {
  return apiErrorFromResponse(
    status,
    makeErrorResponse({ statusCode: status, code }),
  );
}

afterEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('handleSessionExpired', () => {
  it.each(['NAO_AUTENTICADO', 'REFRESH_TOKEN_INVALIDO'])(
    'leva ao login preservando a página em %s',
    (code) => {
      window.history.replaceState(null, '', '/lotes?page=2');

      handleSessionExpired(apiError(401, code));

      expect(navigateTo).toHaveBeenCalledWith(
        '/login?redirect=%2Flotes%3Fpage%3D2',
      );
    },
  );

  it.each([
    [
      'credencial errada, resultado esperado do login',
      apiError(401, 'CREDENCIAIS_INVALIDAS'),
    ],
    ['falta de permissão', apiError(403, 'ACESSO_NEGADO')],
    ['erro temporário', apiError(500, 'ERRO_INTERNO')],
    ['erro de programação', new TypeError('x')],
  ])('não leva ao login em %s', (_nome, error) => {
    handleSessionExpired(error);

    expect(navigateTo).not.toHaveBeenCalled();
  });
});
