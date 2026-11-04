import { HttpResponse } from 'msw';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { api } from './client';
import { ApiError, NETWORK_ERROR_CODE, UNEXPECTED_ERROR_CODE } from './errors';
import type { Paginated } from './pagination';
import { unwrap } from './request';
import type { components } from './schema';

type LoteamentoDto = components['schemas']['LoteamentoDto'];

const LOTEAMENTO_ID = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';
const META = { page: 1, pageSize: 20, total: 1, totalPages: 1 };

const loteamento: LoteamentoDto = {
  id: LOTEAMENTO_ID,
  nome: 'Residencial Teste',
  descricao: null,
  localizacao: null,
  createdAt: '2026-10-28T12:00:00.000Z',
  updatedAt: '2026-10-28T12:00:00.000Z',
};

function listLoteamentos() {
  return unwrap(
    api.GET('/v1/loteamentos', {
      params: { query: { page: 1, pageSize: 20 } },
    }),
  );
}

function deleteLoteamento() {
  return unwrap(
    api.DELETE('/v1/loteamentos/{id}', {
      params: { path: { id: LOTEAMENTO_ID } },
    }),
  );
}

function rotaInexistente() {
  // @ts-expect-error a rota não existe no schema
  return api.GET('/v1/nao-existe');
}

function statusInexistente() {
  return api.GET('/v1/lotes', {
    params: {
      // @ts-expect-error o status não existe no enum do schema
      query: { page: 1, pageSize: 20, status: ['INEXISTENTE'] },
    },
  });
}

async function catchError(promise: Promise<unknown>) {
  return promise.then(
    () => {
      throw new Error('A requisição deveria ter falhado');
    },
    (error: unknown) => error,
  );
}

describe('api', () => {
  it('chama o proxy com a rota do schema, sem repetir /v1', async () => {
    const urls: string[] = [];
    server.use(
      http.get('/v1/loteamentos', ({ request, response }) => {
        urls.push(new URL(request.url).pathname);
        return response(200).json({ data: [loteamento], meta: META });
      }),
    );

    const resultado = await listLoteamentos();

    expect(urls).toEqual(['/api/backend/v1/loteamentos']);
    expect(resultado).toEqual({ data: [loteamento], meta: META });
  });

  it('envia vários valores de um filtro separados por vírgula', async () => {
    const buscas: string[] = [];
    server.use(
      http.get('/v1/lotes', ({ request, response }) => {
        buscas.push(new URL(request.url).search);
        return response(200).json({
          data: [],
          meta: { ...META, total: 0, totalPages: 0 },
        });
      }),
    );

    await unwrap(
      api.GET('/v1/lotes', {
        params: {
          query: {
            page: 1,
            pageSize: 20,
            status: ['DISPONIVEL', 'RESERVADO'],
          },
        },
      }),
    );

    expect(buscas).toEqual(['?page=1&pageSize=20&status=DISPONIVEL,RESERVADO']);
  });

  it('resolve a resposta 204 sem corpo', async () => {
    server.use(
      http.delete('/v1/loteamentos/{id}', ({ response }) =>
        response(204).empty(),
      ),
    );

    await expect(deleteLoteamento()).resolves.toBeUndefined();
  });

  it('rejeita com ApiError no erro da API, mantendo os erros de campo', async () => {
    const details = [{ field: 'q', messages: ['q must be shorter'] }];
    server.use(
      http.get('/v1/loteamentos', ({ response }) =>
        response(400).json(
          makeErrorResponse({
            statusCode: 400,
            code: 'DADOS_INVALIDOS',
            details,
          }),
        ),
      ),
    );

    const error = await catchError(listLoteamentos());

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      statusCode: 400,
      code: 'DADOS_INVALIDOS',
      details,
    });
  });

  it('rejeita com ApiError em erro sem corpo', async () => {
    server.use(
      http.untyped.get(
        '*/v1/loteamentos',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );

    await expect(catchError(listLoteamentos())).resolves.toMatchObject({
      statusCode: 503,
      code: UNEXPECTED_ERROR_CODE,
    });
  });

  it('não expõe corpo que não é JSON', async () => {
    server.use(
      http.untyped.get('*/v1/loteamentos', () =>
        HttpResponse.html('<html>Bad Gateway</html>', { status: 502 }),
      ),
    );

    const error = await catchError(listLoteamentos());

    expect(error).toMatchObject({ statusCode: 502 });
    expect((error as ApiError).message).not.toContain('Bad Gateway');
  });

  it('rejeita com ApiError na falha de rede', async () => {
    server.use(
      http.untyped.get('*/v1/loteamentos', () => HttpResponse.error()),
    );

    await expect(catchError(listLoteamentos())).resolves.toMatchObject({
      statusCode: 0,
      code: NETWORK_ERROR_CODE,
    });
  });

  it('mantém o cancelamento como AbortError', async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await catchError(
      unwrap(
        api.GET('/v1/loteamentos', {
          params: { query: { page: 1, pageSize: 20 } },
          signal: controller.signal,
        }),
      ),
    );

    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: 'AbortError' });
  });
});

// Conferido pelo `npm run typecheck`, não ao rodar os testes: é aqui que uma
// mudança de contrato aparece. As funções com `@ts-expect-error` nunca são chamadas.
expectTypeOf(listLoteamentos).returns.resolves.toEqualTypeOf<
  Paginated<LoteamentoDto>
>();
expectTypeOf(deleteLoteamento).returns.resolves.toBeUndefined();
expectTypeOf(rotaInexistente).toBeFunction();
expectTypeOf(statusInexistente).toBeFunction();
