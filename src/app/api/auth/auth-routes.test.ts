// @vitest-environment node
import { HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeTokens } from '@/test/factories/tokens.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/shared/auth/session-paths';
import { POST as login } from './login/route';
import { POST as logout } from './logout/route';
import { GET as refresh } from './refresh/route';

vi.mock('server-only', () => ({}));

const FRONT = 'http://front.test';

beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test:3000');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function postRequest(
  path: string,
  {
    body,
    cookie,
    origin = FRONT,
  }: { body?: string; cookie?: string; origin?: string } = {},
) {
  return new NextRequest(`${FRONT}${path}`, {
    method: 'POST',
    body,
    headers: { host: 'front.test', origin, ...(cookie ? { cookie } : {}) },
  });
}

describe('POST /api/auth/login', () => {
  const CREDENCIAIS = JSON.stringify({
    email: 'pessoa@exemplo.com',
    senha: 'senha-de-teste',
  });

  it('grava os cookies e não devolve os tokens no corpo', async () => {
    server.use(
      http.post('/v1/auth/login', ({ response }) =>
        response(200).json(makeTokens()),
      ),
    );

    const response = await login(
      postRequest('/api/auth/login', { body: CREDENCIAIS }),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({
      value: 'access-novo',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 900,
    });
    expect(response.cookies.get(REFRESH_COOKIE)).toMatchObject({
      value: 'refresh-novo',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    });
  });

  it.each([
    [401, 'CREDENCIAIS_INVALIDAS'],
    [429, 'MUITAS_REQUISICOES'],
    [400, 'DADOS_INVALIDOS'],
  ])('repassa o erro %i sem gravar cookies', async (status, code) => {
    const body = makeErrorResponse({ statusCode: status, code });
    server.use(
      http.untyped.post('*/v1/auth/login', () =>
        HttpResponse.json(body, { status }),
      ),
    );

    const response = await login(
      postRequest('/api/auth/login', { body: CREDENCIAIS }),
    );

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual(body);
    expect(response.cookies.get(ACCESS_COOKIE)).toBeUndefined();
  });

  it('responde 502 quando a API está fora do ar', async () => {
    server.use(
      http.untyped.post('*/v1/auth/login', () => HttpResponse.error()),
    );

    const response = await login(
      postRequest('/api/auth/login', { body: CREDENCIAIS }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: 'API_INDISPONIVEL',
    });
  });

  it('não expõe erro da API fora do formato', async () => {
    server.use(
      http.untyped.post('*/v1/auth/login', () =>
        HttpResponse.html('<html>Bad Gateway</html>', { status: 502 }),
      ),
    );

    const response = await login(
      postRequest('/api/auth/login', { body: CREDENCIAIS }),
    );

    await expect(response.json()).resolves.toMatchObject({
      code: 'API_INDISPONIVEL',
    });
  });

  it.each([
    ['JSON inválido', 'nao-e-json'],
    ['corpo que não é objeto', 'null'],
  ])('recusa %s', async (_nome, body) => {
    const response = await login(postRequest('/api/auth/login', { body }));

    expect(response.status).toBe(400);
  });

  it('recusa outra origem', async () => {
    const response = await login(
      postRequest('/api/auth/login', {
        body: CREDENCIAIS,
        origin: 'https://site-malicioso.test',
      }),
    );

    expect(response.status).toBe(403);
  });
});

describe('POST /api/auth/logout', () => {
  const COOKIE = `${ACCESS_COOKIE}=a; ${REFRESH_COOKIE}=refresh-atual`;

  function expectCookiesCleared(response: Awaited<ReturnType<typeof logout>>) {
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({ maxAge: 0 });
    expect(response.cookies.get(REFRESH_COOKIE)).toMatchObject({ maxAge: 0 });
  }

  it('revoga o refresh token e apaga os cookies', async () => {
    const corpos: unknown[] = [];
    server.use(
      http.untyped.post('*/v1/auth/logout', async ({ request }) => {
        corpos.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const response = await logout(
      postRequest('/api/auth/logout', { cookie: COOKIE }),
    );

    expect(response.status).toBe(204);
    expect(corpos).toEqual([{ refreshToken: 'refresh-atual' }]);
    expectCookiesCleared(response);
  });

  it.each([
    ['com erro', () => new HttpResponse(null, { status: 500 })],
    ['fora do ar', () => HttpResponse.error()],
  ])('apaga os cookies mesmo com a API %s', async (_nome, respond) => {
    server.use(http.untyped.post('*/v1/auth/logout', respond));

    const response = await logout(
      postRequest('/api/auth/logout', { cookie: COOKIE }),
    );

    expect(response.status).toBe(204);
    expectCookiesCleared(response);
  });

  it('não chama a API sem refresh token', async () => {
    const response = await logout(postRequest('/api/auth/logout'));

    expect(response.status).toBe(204);
    expectCookiesCleared(response);
  });

  it('recusa outra origem, sem apagar os cookies', async () => {
    const response = await logout(
      postRequest('/api/auth/logout', {
        cookie: COOKIE,
        origin: 'https://site-malicioso.test',
      }),
    );

    expect(response.status).toBe(403);
    expect(response.cookies.get(REFRESH_COOKIE)).toBeUndefined();
  });
});

describe('GET /api/auth/refresh', () => {
  let nextToken = 0;

  function refreshRequest(redirect: string, hasRefresh = true) {
    nextToken += 1;

    return new NextRequest(
      `${FRONT}/api/auth/refresh?redirect=${encodeURIComponent(redirect)}`,
      {
        headers: hasRefresh
          ? { cookie: `${REFRESH_COOKIE}=refresh-rota-${nextToken}` }
          : {},
      },
    );
  }

  it('renova e volta à página de destino', async () => {
    server.use(
      http.post('/v1/auth/refresh', ({ response }) =>
        response(200).json(makeTokens()),
      ),
    );

    const response = await refresh(refreshRequest('/lotes?page=2'));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/lotes?page=2');
    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe('access-novo');
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe('refresh-novo');
  });

  it('não redireciona para fora do sistema', async () => {
    server.use(
      http.post('/v1/auth/refresh', ({ response }) =>
        response(200).json(makeTokens()),
      ),
    );

    const response = await refresh(refreshRequest('//site-malicioso.test'));

    expect(response.headers.get('location')).toBe('/');
  });

  it('com refresh inválido, apaga os cookies e leva ao login com o destino', async () => {
    server.use(
      http.untyped.post('*/v1/auth/refresh', () =>
        HttpResponse.json(
          makeErrorResponse({
            statusCode: 401,
            code: 'REFRESH_TOKEN_INVALIDO',
          }),
          { status: 401 },
        ),
      ),
    );

    const response = await refresh(refreshRequest('/lotes'));

    expect(response.headers.get('location')).toBe('/login?redirect=%2Flotes');
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({ maxAge: 0 });
    expect(response.cookies.get(REFRESH_COOKIE)).toMatchObject({ maxAge: 0 });
  });

  it('sem refresh token, apaga os cookies e leva ao login', async () => {
    const response = await refresh(refreshRequest('/lotes', false));

    expect(response.headers.get('location')).toBe('/login?redirect=%2Flotes');
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({ maxAge: 0 });
  });

  it('em falha temporária, mantém os cookies e não leva ao login', async () => {
    server.use(
      http.untyped.post(
        '*/v1/auth/refresh',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );

    const response = await refresh(refreshRequest('/lotes'));

    expect(response.headers.get('location')).toBe(
      '/sessao-indisponivel?redirect=%2Flotes',
    );
    expect(response.cookies.get(REFRESH_COOKIE)).toBeUndefined();
  });
});
