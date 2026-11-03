// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GET } from './route';

vi.mock('server-only', () => ({}));

beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test:3000');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('consulta a rota de health da API configurada', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null));
  vi.stubGlobal('fetch', fetchMock);

  const response = await GET();

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    status: 'ok',
    apiReachable: true,
  });
  expect(fetchMock.mock.calls[0]?.[0]).toEqual(
    new URL('http://api.test:3000/health'),
  );
});

it('considera a API alcançada mesmo quando ela responde com erro', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 503 })),
  );

  const response = await GET();

  await expect(response.json()).resolves.toMatchObject({ apiReachable: true });
});

it('continua respondendo 200 quando a API está fora do ar', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed')),
  );

  const response = await GET();

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    status: 'ok',
    apiReachable: false,
  });
});
