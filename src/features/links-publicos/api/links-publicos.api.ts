import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
export type LinkPublico = components['schemas']['LinkPublicoDto'];
export type CreateLink = components['schemas']['CreateLinkPublicoDto'];
export function listLinks(query: { page: number; pageSize: number }) {
  return unwrap(api.GET('/v1/links-publicos', { params: { query } }));
}
export function createLink(body: CreateLink) {
  return unwrap(api.POST('/v1/links-publicos', { body }));
}
export function desativarLink(id: string) {
  return unwrap(
    api.POST('/v1/links-publicos/{id}/desativar', { params: { path: { id } } }),
  );
}
export async function listEscopos() {
  const itens: components['schemas']['LoteamentoDto'][] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const pagina = await unwrap(
      api.GET('/v1/loteamentos', {
        params: { query: { page, pageSize: 100 } },
      }),
    );
    itens.push(...pagina.data);
    totalPages = pagina.meta.totalPages;
    page++;
  } while (page <= totalPages);
  return itens;
}
