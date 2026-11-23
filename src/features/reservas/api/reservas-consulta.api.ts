import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';

export type ReservaResumo = components['schemas']['ReservaResumoDto'];
export async function listVendedoresReservas() {
  const items: components['schemas']['VendedorReservaDto'][] = [];
  for (let page = 1; ; page++) {
    const resultado = await unwrap(
      api.GET('/v1/reservas/vendedores', {
        params: { query: { page, pageSize: 100 } },
      }),
    );
    items.push(...resultado.data);
    if (page >= resultado.meta.totalPages) return items;
  }
}
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
        query: { page: 1, pageSize: 100 },
      },
    }),
  );
}
