import { describe, expect, it } from 'vitest';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import {
  ApiError,
  apiErrorFromNetworkFailure,
  apiErrorFromResponse,
  getErrorMessage,
  NETWORK_ERROR_CODE,
  NETWORK_ERROR_STATUS,
  UNEXPECTED_ERROR_CODE,
} from './errors';

describe('apiErrorFromResponse', () => {
  it('converte o 400 com os erros de campo', () => {
    const details = [
      { field: 'nome', messages: ['nome should not be empty'] },
      { field: 'endereco.cep', messages: ['cep inválido'] },
    ];

    const error = apiErrorFromResponse(
      400,
      makeErrorResponse({
        statusCode: 400,
        code: 'DADOS_INVALIDOS',
        message: 'Os dados enviados são inválidos',
        details,
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('DADOS_INVALIDOS');
    expect(error.message).toBe(
      'Os dados enviados são inválidos. Confira os campos.',
    );
    expect(error.details).toEqual(details);
  });

  it('mantém a mensagem da API no 404 de um código de domínio', () => {
    const error = apiErrorFromResponse(404, makeErrorResponse());

    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('LOTE_NAO_ENCONTRADO');
    expect(error.message).toBe('Lote não encontrado');
    expect(error.details).toEqual([]);
  });

  it('usa a mensagem amigável no 409 de lote indisponível', () => {
    const error = apiErrorFromResponse(
      409,
      makeErrorResponse({
        statusCode: 409,
        code: 'LOTE_INDISPONIVEL',
        message: 'O lote não está disponível para reserva',
      }),
    );

    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('LOTE_INDISPONIVEL');
    expect(error.message).toBe('Este lote não está mais disponível.');
  });

  it('não exibe a mensagem em inglês gerada pelo Nest', () => {
    const error = apiErrorFromResponse(
      403,
      makeErrorResponse({
        statusCode: 403,
        code: 'ACESSO_NEGADO',
        message: 'Forbidden resource',
      }),
    );

    expect(error.message).toBe(
      'Você não tem permissão para executar esta ação.',
    );
  });

  it('usa a mensagem genérica no 500', () => {
    const error = apiErrorFromResponse(
      500,
      makeErrorResponse({
        statusCode: 500,
        code: 'ERRO_INTERNO',
        message: 'Erro interno do servidor',
      }),
    );

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('ERRO_INTERNO');
    expect(error.message).toBe(
      'Não foi possível concluir a operação. Tente novamente em instantes.',
    );
  });

  it.each([
    ['HTML de um intermediário', '<html>Bad Gateway</html>'],
    ['corpo vazio', undefined],
    ['nulo', null],
    ['objeto sem code', { message: 'Bad Gateway' }],
    ['objeto sem message', { code: 'X' }],
    ['details inválido', { code: 'X', message: 'Y', details: 'Z' }],
  ])('não expõe corpo fora do formato: %s', (_nome, body) => {
    const error = apiErrorFromResponse(502, body);

    expect(error.statusCode).toBe(502);
    expect(error.code).toBe(UNEXPECTED_ERROR_CODE);
    expect(error.message).toBe(
      'Não foi possível concluir a operação. Tente novamente em instantes.',
    );
  });
});

describe('apiErrorFromNetworkFailure', () => {
  it('converte a falha de rede', () => {
    const error = apiErrorFromNetworkFailure();

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(NETWORK_ERROR_STATUS);
    expect(error.code).toBe(NETWORK_ERROR_CODE);
    expect(error.message).toContain('Não foi possível conectar ao servidor');
  });
});

describe('getErrorMessage', () => {
  it('devolve a mensagem do ApiError', () => {
    const error = apiErrorFromResponse(404, makeErrorResponse());

    expect(getErrorMessage(error)).toBe('Lote não encontrado');
  });

  it.each([
    [new TypeError("Cannot read properties of undefined (reading 'x')")],
    ['texto solto'],
    [undefined],
  ])('não expõe o que não for ApiError: %s', (error) => {
    expect(getErrorMessage(error)).toBe(
      'Não foi possível concluir a operação. Tente novamente em instantes.',
    );
  });
});
