import 'server-only';
import { getServerEnv } from '@/shared/config/env.server';
import { createApi } from './create-api';

/**
 * Cliente de Server Components e Route Handlers: fala direto com a API.
 * O token é parâmetro porque nem toda chamada usa sessão, como o login e a
 * página pública.
 */
export function getServerApi(accessToken?: string) {
  return createApi({
    baseUrl: getServerEnv().API_URL,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}
