import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';

export type ReservaResumo = components['schemas']['ReservaResumoDto'];
export type ListReservasQuery = NonNullable<
  paths['/v1/reservas']['get']['parameters']['query']
>;

export function listReservas(query: ListReservasQuery, minhas: boolean) {
  return minhas
    ? unwrap(api.GET('/v1/reservas/minhas', { params: { query } }))
    : unwrap(api.GET('/v1/reservas', { params: { query } }));
}

export function listLoteamentosReservas() {
  return unwrap(
    api.GET('/v1/loteamentos', {
      params: {
        query: { page: 1, pageSize: 100, orderBy: 'nome', order: 'asc' },
      },
    }),
  );
}
