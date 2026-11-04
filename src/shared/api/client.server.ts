import 'server-only';
import { getServerEnv } from '@/shared/config/env.server';
import { createApi } from './create-api';

/**
 * Cliente de Server Components e Route Handlers: fala direto com a API.
 * O token é parâmetro porque a leitura do cookie de sessão chega na FE-07 e a
 * página pública não usa sessão.
 */
export function getServerApi(accessToken?: string) {
  return createApi({
    baseUrl: getServerEnv().API_URL,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}
