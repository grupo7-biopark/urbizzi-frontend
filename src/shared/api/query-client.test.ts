import { environmentManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { apiErrorFromNetworkFailure, apiErrorFromResponse } from './errors';
import {
  getQueryClient,
  makeQueryClient,
  shouldRetryQuery,
} from './query-client';

describe('shouldRetryQuery', () => {
  it('tenta de novo em erro de rede', () => {
    expect(shouldRetryQuery(0, apiErrorFromNetworkFailure())).toBe(true);
  });

  it.each([500, 502, 503])('tenta de novo em %i', (status) => {
    const error = apiErrorFromResponse(status, makeErrorResponse());

    expect(shouldRetryQuery(0, error)).toBe(true);
  });

  it.each([400, 401, 403, 404, 409, 422, 429])(
    'não tenta de novo em %i',
    (status) => {
      const error = apiErrorFromResponse(status, makeErrorResponse());

      expect(shouldRetryQuery(0, error)).toBe(false);
    },
  );

  it('para depois de três tentativas', () => {
    const error = apiErrorFromNetworkFailure();

    expect(shouldRetryQuery(2, error)).toBe(true);
    expect(shouldRetryQuery(3, error)).toBe(false);
  });

  it('não tenta de novo em erro de programação', () => {
    expect(shouldRetryQuery(0, new TypeError('x'))).toBe(false);
  });
});

describe('makeQueryClient', () => {
  it('aplica os padrões de retry e staleTime às queries', () => {
    const { queries } = makeQueryClient().getDefaultOptions();

    expect(queries?.retry).toBe(shouldRetryQuery);
    expect(queries?.staleTime).toBeGreaterThan(0);
  });
});

describe('getQueryClient', () => {
  afterEach(() => {
    environmentManager.setIsServer(() => typeof window === 'undefined');
  });

  it('reaproveita o cliente no navegador', () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });

  it('cria um cliente por chamada no servidor', () => {
    environmentManager.setIsServer(() => true);

    expect(getQueryClient()).not.toBe(getQueryClient());
  });
});
