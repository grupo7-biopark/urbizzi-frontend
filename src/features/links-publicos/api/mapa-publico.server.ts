import 'server-only';
import { getServerApi } from '@/shared/api/client.server';
import { unwrap } from '@/shared/api/request';
/** Sem sessão: a única credencial desta consulta é o link público. */
export function getMapaPublico(token: string, page: number) {
  return unwrap(
    getServerApi().GET('/v1/publico/{token}', {
      params: { path: { token }, query: { page, pageSize: 100 } },
      cache: 'no-store',
    }),
  );
}
