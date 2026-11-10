import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
export async function listAreas(loteamentoId: string) {
  const items: components['schemas']['AreaGeograficaDto'][] = [];
  for (let page = 1; ; page++) {
    const result = await unwrap(
      api.GET('/v1/geografia/areas', {
        params: { query: { loteamentoId, page, pageSize: 100 } },
      }),
    );
    items.push(...result.data);
    if (page >= result.meta.totalPages) return items;
  }
}
export function getArea(id: string) {
  return unwrap(
    api.GET('/v1/geografia/areas/{id}', { params: { path: { id } } }),
  );
}
export async function buscarLocal(q: string) {
  return (
    await unwrap(
      api.GET('/v1/geografia/busca', {
        params: { query: { q, page: 1, pageSize: 5 } },
      }),
    )
  ).data;
}
