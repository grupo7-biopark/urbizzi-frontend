import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
export async function listAreasGeograficas() {
  const areas: components['schemas']['AreaGeograficaDto'][] = [];
  for (let page = 1; ; page++) {
    const result = await unwrap(
      api.GET('/v1/geografia/areas', {
        params: { query: { page, pageSize: 100 } },
      }),
    );
    areas.push(...result.data);
    if (page >= result.meta.totalPages) return areas;
  }
}
