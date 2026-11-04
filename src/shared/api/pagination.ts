import type { components } from './schema';

export type PaginationMeta = components['schemas']['PaginationMetaDto'];

/** O OpenAPI descreve o `PaginatedDto` inline em cada rota, sem um nome reutilizável. */
export type Paginated<Item> = {
  data: Item[];
  meta: PaginationMeta;
};

export function hasNextPage({ page, totalPages }: PaginationMeta) {
  return page < totalPages;
}

export function hasPreviousPage({ page }: PaginationMeta) {
  return page > 1;
}

/** A API responde `200` com `data: []` nesse caso; a tela oferece voltar à primeira página. */
export function isBeyondLastPage({ page, totalPages }: PaginationMeta) {
  return page > 1 && page > totalPages;
}
