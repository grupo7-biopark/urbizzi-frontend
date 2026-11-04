import { apiErrorFromNetworkFailure, apiErrorFromResponse } from './errors';

type ApiResult<Data> = {
  data?: Data;
  error?: unknown;
  response: Response;
};

function isAbort(cause: unknown) {
  return cause instanceof Error && cause.name === 'AbortError';
}

/**
 * O `openapi-fetch` devolve o erro em vez de lançá-lo, mas o TanStack Query
 * espera uma Promise rejeitada. Confere `response.ok`, e não `error`, porque
 * um erro sem corpo vem com `error` indefinido.
 */
export async function unwrap<Data>(
  request: Promise<ApiResult<Data>>,
): Promise<Data> {
  let result: ApiResult<Data>;

  try {
    result = await request;
  } catch (cause) {
    // Cancelamento não é falha de rede: o TanStack Query o trata sozinho.
    if (isAbort(cause)) {
      throw cause;
    }
    throw apiErrorFromNetworkFailure();
  }

  if (!result.response.ok) {
    throw apiErrorFromResponse(result.response.status, result.error);
  }

  return result.data as Data;
}
