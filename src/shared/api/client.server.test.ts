// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { http } from '@/test/http';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { server } from '@/test/server';
import { getServerApi } from './client.server';
import { unwrap } from './request';
import type { components } from './schema';

vi.mock('server-only', () => ({}));

const USUARIO: components['schemas']['UsuarioLogadoDto'] = {
  id: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
  nome: 'Pessoa Teste',
  email: 'pessoa@exemplo.com',
  perfil: 'COMERCIAL',
};

beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test:3000');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function captureRequests() {
  const requests: Request[] = [];
  server.use(
    http.get('/v1/auth/me', ({ request, response }) => {
      requests.push(request);
      return response(200).json(USUARIO);
    }),
  );
  return requests;
}

it('chama a API_URL com o token informado', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const requests = captureRequests();

  await unwrap(getServerApi('token-de-teste').GET('/v1/auth/me'));

  expect(requests[0]?.url).toBe('http://api.test:3000/v1/auth/me');
  expect(requests[0]?.headers.get('Authorization')).toBe(
    'Bearer token-de-teste',
  );
  expect(fetchSpy.mock.calls[0]?.[0]).toMatchObject({ credentials: 'omit' });
});

it('não envia Authorization sem token', async () => {
  const requests = captureRequests();

  await unwrap(getServerApi().GET('/v1/auth/me'));

  expect(requests[0]?.headers.has('Authorization')).toBe(false);
});

it('preserva a recusa de login da API sem transformá-la em erro de rede', async () => {
  server.use(
    http.post('/v1/auth/login', ({ response }) =>
      response(401).json(
        makeErrorResponse({
          statusCode: 401,
          code: 'CREDENCIAIS_INVALIDAS',
          message: 'Credenciais inválidas',
        }),
      ),
    ),
  );
  const result = await getServerApi().POST('/v1/auth/login', {
    body: { email: 'pessoa@exemplo.com', senha: 'senha-incorreta' },
  });
  expect(result.response.status).toBe(401);
  expect(result.error?.code).toBe('CREDENCIAIS_INVALIDAS');
});
