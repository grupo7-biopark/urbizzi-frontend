import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';

export type Historico = components['schemas']['HistoricoDto'];
export type HistoricoQuery = NonNullable<
  paths['/v1/historico']['get']['parameters']['query']
>;
export function listHistorico(query: HistoricoQuery) {
  return unwrap(api.GET('/v1/historico', { params: { query } }));
}
