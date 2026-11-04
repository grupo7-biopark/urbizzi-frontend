// @vitest-environment node
import { HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeTokens } from '@/test/factories/tokens.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { proxyToBackend } from './backend-proxy.server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './session-paths';

vi.mock('server-only', () => ({}));

const NAO_AUTENTICADO = makeErrorResponse({
  statusCode: 401,
  code: 'NAO_AUTENTICADO',
});
const FRONT = 'http://front.test';

let nextToken = 0;

/** O refresh é de uso único e fica guardado por alguns segundos: um por teste. */
function uniqueRefreshToken() {
  nextToken += 1;
  return `refresh-${nextToken}`;
}

beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test:3000');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

type Options = {
  method?: string;
  access?: string;
  refresh?: string;
  origin?: string | null;
  body?: BodyInit;
  headers?: Record<string, string>;
  search?: string;
};

function makeRequest({
  method = 'GET',
  access,
  refresh,
  origin = FRONT,
  body,
  headers = {},
  search = '',
}: Options = {}) {
  const cookies = [
    access && `${ACCESS_COOKIE}=${access}`,
    refresh && `${REFRESH_COOKIE}=${refresh}`,
  ].filter(Boolean);

  return new NextRequest(`${FRONT}/api/backend/v1/lotes${search}`, {
    method,
    body,
    duplex: 'half',
    headers: {
      host: 'front.test',
      ...(origin ? { origin } : {}),
      ...(cookies.length > 0 ? { cookie: cookies.join('; ') } : {}),
      ...headers,
    },
  } as ConstructorParameters<typeof NextRequest>[1]);
}

const SEGMENTS = ['v1', 'lotes'];

/** Responde 401 ao token vencido, e 200 ao novo, registrando os tokens recebidos. */
function mockExpiredAccess() {
  const tokens: (string | null)[] = [];
  const bodies: string[] = [];
  const handler = async ({ request }: { request: Request }) => {
    const authorization = request.headers.get('authorization');
    tokens.push(authorization);
    bodies.push(await request.text());
    return authorization === 'Bearer access-novo'
      ? HttpResponse.json({ ok: true })
      : HttpResponse.json(NAO_AUTENTICADO, { status: 401 });
  };
  server.use(
    http.untyped.get('*/v1/lotes', handler),
    http.untyped.post('*/v1/lotes', handler),
  );
  return { tokens, bodies };
}

function mockRefresh(respond: () => Response) {
  const calls = { count: 0 };
  server.use(
    http.untyped.post('*/v1/auth/refresh', () => {
      calls.count += 1;
      return respond();
    }),
  );
  return calls;
}

describe('repasse', () => {
  it('injeta o token e encaminha só para a API configurada', async () => {
    const requests: Request[] = [];
    server.use(
      http.untyped.get('*/v1/lotes', ({ request }) => {
        requests.push(request);
        return HttpResponse.json({ data: [] });
      }),
    );

    const response = await proxyToBackend(
      makeRequest({
        access: 'access-valido',
        search: '?status=A,B&page=2',
        headers: { accept: 'application/json', 'x-outro': 'nao-repassar' },
      }),
      SEGMENTS,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [] });
    const [request] = requests;
    expect(request?.url).toBe(
      'http://api.test:3000/v1/lotes?status=A,B&page=2',
    );
    expect(request?.headers.get('authorization')).toBe('Bearer access-valido');
    expect(request?.headers.get('accept')).toBe('application/json');
    expect(request?.headers.has('x-outro')).toBe(false);
  });

  it('não repassa o header Cookie à API', async () => {
    const requests: Request[] = [];
    server.use(
      http.untyped.get('*/v1/lotes', ({ request }) => {
        requests.push(request);
        return HttpResponse.json({});
      }),
    );

    await proxyToBackend(makeRequest({ access: 'a', refresh: 'b' }), SEGMENTS);

    expect(requests[0]?.headers.has('cookie')).toBe(false);
  });

  it('encaminha sem token quem não tem sessão, e a API decide', async () => {
    const requests: Request[] = [];
    server.use(
      http.untyped.get('*/v1/lotes', ({ request }) => {
        requests.push(request);
        return HttpResponse.json(NAO_AUTENTICADO, { status: 401 });
      }),
    );

    const response = await proxyToBackend(makeRequest(), SEGMENTS);

    expect(response.status).toBe(401);
    expect(requests[0]?.headers.has('authorization')).toBe(false);
  });

  it('repassa os erros da API sem alterar', async () => {
    const body = makeErrorResponse({ statusCode: 409, code: 'LOTE_JA_EXISTE' });
    server.use(
      http.untyped.get('*/v1/lotes', () =>
        HttpResponse.json(body, { status: 409 }),
      ),
    );

    const response = await proxyToBackend(
      makeRequest({ access: 'access-valido' }),
      SEGMENTS,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(body);
  });

  it('repassa a resposta 204 sem corpo', async () => {
    server.use(
      http.untyped.delete(
        '*/v1/lotes',
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    const response = await proxyToBackend(
      makeRequest({ method: 'DELETE', access: 'access-valido' }),
      SEGMENTS,
    );

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it('não repassa Set-Cookie da API e impede cache por padrão', async () => {
    server.use(
      http.untyped.get('*/v1/lotes', () =>
        HttpResponse.json({}, { headers: { 'Set-Cookie': 'a=b' } }),
      ),
    );

    const response = await proxyToBackend(
      makeRequest({ access: 'access-valido' }),
      SEGMENTS,
    );

    expect(response.headers.has('set-cookie')).toBe(false);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('mantém o cache definido pela API', async () => {
    server.use(
      http.untyped.get('*/v1/lotes', () =>
        HttpResponse.json(
          {},
          { headers: { 'Cache-Control': 'public, max-age=60' } },
        ),
      ),
    );

    const response = await proxyToBackend(
      makeRequest({ access: 'access-valido' }),
      SEGMENTS,
    );

    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
  });

  it('responde 502 com o formato da API quando ela está fora do ar', async () => {
    server.use(http.untyped.get('*/v1/lotes', () => HttpResponse.error()));

    const response = await proxyToBackend(
      makeRequest({ access: 'access-valido' }),
      SEGMENTS,
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: 'API_INDISPONIVEL',
    });
  });
});

describe('destino', () => {
  it.each([
    ['fora de /v1', ['health']],
    ['outra versão', ['v2', 'lotes']],
    ['subindo de pasta', ['v1', '..', 'health']],
    ['ponto', ['v1', '.', 'lotes']],
    ['segmento vazio', ['v1', '', 'lotes']],
  ])('recusa caminho %s', async (_nome, segments) => {
    const response = await proxyToBackend(makeRequest(), segments);

    expect(response.status).toBe(404);
  });

  it.each([
    ['login', ['v1', 'auth', 'login']],
    ['refresh', ['v1', 'auth', 'refresh']],
    ['logout', ['v1', 'auth', 'logout']],
    ['maiúsculas', ['v1', 'AUTH', 'LOGIN']],
  ])('nunca entrega tokens ao navegador: %s', async (_nome, segments) => {
    const response = await proxyToBackend(
      makeRequest({ method: 'POST', body: '{}' }),
      segments,
    );

    expect(response.status).toBe(404);
  });

  it('não deixa um segmento codificado escapar do caminho', async () => {
    const urls: string[] = [];
    server.use(
      http.untyped.get('*/v1/*', ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json({});
      }),
    );

    await proxyToBackend(makeRequest(), ['v1', '../../health']);

    expect(urls).toEqual(['http://api.test:3000/v1/..%2F..%2Fhealth']);
  });
});

describe('origem', () => {
  it.each([
    ['outro site', 'https://site-malicioso.test'],
    ['ausente', null],
    ['opaca', 'null'],
  ])('recusa método que altera dados com origem %s', async (_nome, origin) => {
    const response = await proxyToBackend(
      makeRequest({ method: 'POST', access: 'a', origin, body: '{}' }),
      SEGMENTS,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: 'ORIGEM_INVALIDA',
    });
  });

  it('aceita a mesma origem atrás de um proxy reverso', async () => {
    server.use(http.untyped.post('*/v1/lotes', () => HttpResponse.json({})));

    const response = await proxyToBackend(
      makeRequest({
        method: 'POST',
        access: 'a',
        origin: 'https://urbizzi.test',
        body: '{}',
        headers: { 'x-forwarded-host': 'urbizzi.test, interno.test' },
      }),
      SEGMENTS,
    );

    expect(response.status).toBe(200);
  });

  it('não exige origem na leitura', async () => {
    server.use(http.untyped.get('*/v1/lotes', () => HttpResponse.json({})));

    const response = await proxyToBackend(
      makeRequest({ access: 'a', origin: null }),
      SEGMENTS,
    );

    expect(response.status).toBe(200);
  });
});

describe('renovação', () => {
  it('renova no 401, reenvia com o novo token e grava os cookies', async () => {
    const { tokens } = mockExpiredAccess();
    mockRefresh(() => Response.json(makeTokens()));

    const response = await proxyToBackend(
      makeRequest({ access: 'vencido', refresh: uniqueRefreshToken() }),
      SEGMENTS,
    );

    expect(response.status).toBe(200);
    expect(tokens).toEqual(['Bearer vencido', 'Bearer access-novo']);
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({
      value: 'access-novo',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 900,
    });
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe('refresh-novo');
  });

  it('reenvia o corpo original depois de renovar', async () => {
    const { bodies } = mockExpiredAccess();
    mockRefresh(() => Response.json(makeTokens()));

    await proxyToBackend(
      makeRequest({
        method: 'POST',
        access: 'vencido',
        refresh: uniqueRefreshToken(),
        body: '{"numero":"12"}',
      }),
      SEGMENTS,
    );

    expect(bodies).toEqual(['{"numero":"12"}', '{"numero":"12"}']);
  });

  it('renova uma vez só com requisições simultâneas', async () => {
    mockExpiredAccess();
    const refresh = mockRefresh(() => Response.json(makeTokens()));
    const refreshToken = uniqueRefreshToken();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        proxyToBackend(
          makeRequest({ access: 'vencido', refresh: refreshToken }),
          SEGMENTS,
        ),
      ),
    );

    expect(refresh.count).toBe(1);
    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 200, 200, 200,
    ]);
    for (const response of responses) {
      expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe('refresh-novo');
    }
  });

  it('renova antes de enviar quando o cookie do access token já expirou', async () => {
    const { tokens } = mockExpiredAccess();
    mockRefresh(() => Response.json(makeTokens()));

    const response = await proxyToBackend(
      makeRequest({ refresh: uniqueRefreshToken() }),
      SEGMENTS,
    );

    expect(response.status).toBe(200);
    expect(tokens).toEqual(['Bearer access-novo']);
    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe('access-novo');
  });

  it.each([
    ['com access token', { access: 'vencido' }],
    ['sem access token', {}],
  ])('apaga os cookies com o refresh recusado, %s', async (_nome, options) => {
    mockExpiredAccess();
    const body = makeErrorResponse({
      statusCode: 401,
      code: 'REFRESH_TOKEN_INVALIDO',
    });
    mockRefresh(() => HttpResponse.json(body, { status: 401 }));

    const response = await proxyToBackend(
      makeRequest({ ...options, refresh: uniqueRefreshToken() }),
      SEGMENTS,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual(body);
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({ maxAge: 0 });
    expect(response.cookies.get(REFRESH_COOKIE)).toMatchObject({ maxAge: 0 });
  });

  it.each([
    ['com access token', { access: 'vencido' }],
    ['sem access token', {}],
  ])('mantém os cookies em falha temporária, %s', async (_nome, options) => {
    mockExpiredAccess();
    const body = makeErrorResponse({
      statusCode: 429,
      code: 'MUITAS_REQUISICOES',
    });
    mockRefresh(() => HttpResponse.json(body, { status: 429 }));

    const response = await proxyToBackend(
      makeRequest({ ...options, refresh: uniqueRefreshToken() }),
      SEGMENTS,
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual(body);
    expect(response.cookies.get(REFRESH_COOKIE)).toBeUndefined();
  });

  it('apaga os cookies do token recusado quando não há refresh', async () => {
    mockExpiredAccess();

    const response = await proxyToBackend(
      makeRequest({ access: 'vencido' }),
      SEGMENTS,
    );

    expect(response.status).toBe(401);
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({ maxAge: 0 });
  });

  it('encerra a sessão quando o token novo também é recusado (usuário desativado)', async () => {
    server.use(
      http.untyped.get('*/v1/lotes', () =>
        HttpResponse.json(NAO_AUTENTICADO, { status: 401 }),
      ),
    );
    mockRefresh(() => Response.json(makeTokens()));

    const response = await proxyToBackend(
      makeRequest({ access: 'vencido', refresh: uniqueRefreshToken() }),
      SEGMENTS,
    );

    expect(response.status).toBe(401);
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({ maxAge: 0 });
    expect(response.cookies.get(REFRESH_COOKIE)).toMatchObject({ maxAge: 0 });
  });

  it('encerra a sessão quando o token recém-renovado é recusado', async () => {
    server.use(
      http.untyped.get('*/v1/lotes', () =>
        HttpResponse.json(NAO_AUTENTICADO, { status: 401 }),
      ),
    );
    const refresh = mockRefresh(() => Response.json(makeTokens()));

    const response = await proxyToBackend(
      makeRequest({ refresh: uniqueRefreshToken() }),
      SEGMENTS,
    );

    expect(response.status).toBe(401);
    expect(refresh.count).toBe(1);
    expect(response.cookies.get(REFRESH_COOKIE)).toMatchObject({ maxAge: 0 });
  });

  it('não confunde outro 401 da API com a sessão', async () => {
    const body = makeErrorResponse({
      statusCode: 401,
      code: 'TOKEN_RECUPERACAO_INVALIDO',
    });
    server.use(
      http.untyped.get('*/v1/lotes', () =>
        HttpResponse.json(body, { status: 401 }),
      ),
    );
    const refresh = mockRefresh(() => Response.json(makeTokens()));

    const response = await proxyToBackend(
      makeRequest({ access: 'valido', refresh: uniqueRefreshToken() }),
      SEGMENTS,
    );

    expect(response.status).toBe(401);
    expect(refresh.count).toBe(0);
    expect(response.cookies.get(ACCESS_COOKIE)).toBeUndefined();
  });

  it('não confunde um 401 sem JSON com a sessão', async () => {
    server.use(
      http.untyped.get(
        '*/v1/lotes',
        () => new HttpResponse('Unauthorized', { status: 401 }),
      ),
    );
    const refresh = mockRefresh(() => Response.json(makeTokens()));

    await proxyToBackend(
      makeRequest({ access: 'valido', refresh: uniqueRefreshToken() }),
      SEGMENTS,
    );

    expect(refresh.count).toBe(0);
  });
});

describe('corpo grande', () => {
  const GRANDE = { 'content-length': String(11 * 1024 * 1024) };

  it('segue em fluxo, sem guardar em memória', async () => {
    const { bodies } = mockExpiredAccess();
    mockRefresh(() => Response.json(makeTokens()));

    const response = await proxyToBackend(
      makeRequest({
        method: 'POST',
        access: 'access-novo',
        body: 'planta',
        headers: GRANDE,
      }),
      SEGMENTS,
    );

    expect(response.status).toBe(200);
    expect(bodies).toEqual(['planta']);
  });

  it('no 401, não reenvia, mas deixa a sessão renovada', async () => {
    const { tokens } = mockExpiredAccess();
    mockRefresh(() => Response.json(makeTokens()));

    const response = await proxyToBackend(
      makeRequest({
        method: 'POST',
        access: 'vencido',
        refresh: uniqueRefreshToken(),
        body: 'planta',
        headers: GRANDE,
      }),
      SEGMENTS,
    );

    expect(response.status).toBe(401);
    expect(tokens).toEqual(['Bearer vencido']);
    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe('access-novo');
  });
});
