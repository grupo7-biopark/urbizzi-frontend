import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getServerApi } from '@/shared/api/client.server';
import { ApiError } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import {
  ACCESS_COOKIE,
  CURRENT_PATH_HEADER,
  DEFAULT_PATH,
  getRefreshPath,
} from './session-paths';

async function fetchUsuarioAtual(accessToken: string) {
  try {
    return await unwrap(getServerApi(accessToken).GET('/v1/auth/me'));
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Usuário da sessão, para Server Components. Um Server Component não grava
 * cookies, então a renovação passa pela rota `/api/auth/refresh`, que também
 * encerra a sessão quando ela não vale mais.
 */
export const getUsuarioAtual = cache(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const usuario = accessToken ? await fetchUsuarioAtual(accessToken) : null;

  if (!usuario) {
    redirect(
      getRefreshPath(headerStore.get(CURRENT_PATH_HEADER) ?? DEFAULT_PATH),
    );
  }

  return usuario;
});
