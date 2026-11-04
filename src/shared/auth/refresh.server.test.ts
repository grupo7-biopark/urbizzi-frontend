// @vitest-environment node
import { HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeTokens } from '@/test/factories/tokens.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { refreshSession } from './refresh.server';

vi.mock('server-only', () => ({}));

beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test:3000');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function countRefreshes(respond: () => Response) {
  const calls = { count: 0 };
  server.use(
    http.untyped.post('*/v1/auth/refresh', () => {
      calls.count += 1;
      return respond();
    }),
  );
  return calls;
}

describe('refreshSession', () => {
  it('renova uma vez só com requisições simultâneas', async () => {
    const calls = countRefreshes(() => Response.json(makeTokens()));

    const results = await Promise.all([
      refreshSession('refresh-simultaneo'),
      refreshSession('refresh-simultaneo'),
      refreshSession('refresh-simultaneo'),
    ]);

    expect(calls.count).toBe(1);
    expect(results.map((result) => result.outcome)).toEqual([
      'renewed',
      'renewed',
      'renewed',
    ]);
  });

  it('renova separadamente sessões diferentes', async () => {
    const calls = countRefreshes(() => Response.json(makeTokens()));

    await Promise.all([
      refreshSession('refresh-sessao-a'),
      refreshSession('refresh-sessao-b'),
    ]);

    expect(calls.count).toBe(2);
  });

  it('reaproveita o resultado para quem chega logo depois com o cookie antigo', async () => {
    const calls = countRefreshes(() => Response.json(makeTokens()));

    await refreshSession('refresh-atrasado');
    const atrasada = await refreshSession('refresh-atrasado');

    expect(calls.count).toBe(1);
    expect(atrasada).toEqual({ outcome: 'renewed', tokens: makeTokens() });
  });

  it('esquece o resultado depois do período de tolerância', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const calls = countRefreshes(() => Response.json(makeTokens()));

    await refreshSession('refresh-tolerancia');
    await vi.advanceTimersByTimeAsync(10_000);
    await refreshSession('refresh-tolerancia');

    expect(calls.count).toBe(2);
  });

  it('informa a recusa da API, sem guardar o resultado', async () => {
    const body = makeErrorResponse({
      statusCode: 401,
      code: 'REFRESH_TOKEN_INVALIDO',
    });
    const calls = countRefreshes(() =>
      HttpResponse.json(body, { status: 401 }),
    );

    const result = await refreshSession('refresh-recusado');
    await refreshSession('refresh-recusado');

    expect(result).toEqual({ outcome: 'rejected', status: 401, body });
    expect(calls.count).toBe(2);
  });

  it.each([429, 500, 503])(
    'trata o %i como falha temporária',
    async (status) => {
      const body = makeErrorResponse({ statusCode: status, code: 'X' });
      countRefreshes(() => HttpResponse.json(body, { status }));

      const result = await refreshSession(`refresh-${status}`);

      expect(result).toEqual({ outcome: 'unavailable', status, body });
    },
  );

  it('trata a falha de rede como temporária', async () => {
    countRefreshes(() => HttpResponse.error());

    const result = await refreshSession('refresh-rede');

    expect(result).toMatchObject({ outcome: 'unavailable', status: 502 });
  });
});
