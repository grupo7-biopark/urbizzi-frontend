import createClient from 'openapi-fetch';
import { toQueryString } from './query-string';
import type { paths } from './schema';

type CreateApiOptions = {
  baseUrl: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
};

/** O `baseUrl` não leva `/v1`: as rotas do schema já incluem a versão. */
export function createApi(options: CreateApiOptions) {
  return createClient<paths>({
    ...options,
    querySerializer: toQueryString,
    // Lido a cada chamada: por padrão, o `openapi-fetch` guarda o `fetch` ao ser
    // criado, antes de o MSW instalar a interceptação nos testes.
    fetch: (request) => globalThis.fetch(request),
  });
}
