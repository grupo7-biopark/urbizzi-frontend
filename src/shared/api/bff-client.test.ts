import { HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { postBff } from './bff-client';
import { NETWORK_ERROR_CODE, UNEXPECTED_ERROR_CODE } from './errors';

describe('postBff', () => {
  it('envia o corpo em JSON', async () => {
    const corpos: unknown[] = [];
    server.use(
      http.untyped.post('*/api/auth/login', async ({ request }) => {
        corpos.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(
      postBff('/api/auth/login', { email: 'pessoa@exemplo.com' }),
    ).resolves.toBeUndefined();

    expect(corpos).toEqual([{ email: 'pessoa@exemplo.com' }]);
  });

  it('envia sem corpo', async () => {
    server.use(
      http.untyped.post(
        '*/api/auth/logout',
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(postBff('/api/auth/logout')).resolves.toBeUndefined();
  });

  it('rejeita com ApiError no erro da rota', async () => {
    server.use(
      http.untyped.post('*/api/auth/login', () =>
        HttpResponse.json(
          makeErrorResponse({
            statusCode: 429,
            code: 'MUITAS_REQUISICOES',
          }),
          { status: 429 },
        ),
      ),
    );

    await expect(postBff('/api/auth/login', {})).rejects.toMatchObject({
      statusCode: 429,
      code: 'MUITAS_REQUISICOES',
    });
  });

  it('rejeita com ApiError em resposta sem JSON', async () => {
    server.use(
      http.untyped.post('*/api/auth/login', () =>
        HttpResponse.html('<html>Erro</html>', { status: 500 }),
      ),
    );

    await expect(postBff('/api/auth/login', {})).rejects.toMatchObject({
      statusCode: 500,
      code: UNEXPECTED_ERROR_CODE,
    });
  });

  it('rejeita com ApiError na falha de rede', async () => {
    server.use(
      http.untyped.post('*/api/auth/login', () => HttpResponse.error()),
    );

    await expect(postBff('/api/auth/login', {})).rejects.toMatchObject({
      code: NETWORK_ERROR_CODE,
    });
  });
});
