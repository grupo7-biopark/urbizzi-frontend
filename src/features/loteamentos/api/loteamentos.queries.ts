import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import {
  getLoteamento,
  listLoteamentos,
  listQuadras,
  type ListLoteamentosQuery,
  type ListQuadrasQuery,
} from './loteamentos.api';

export const loteamentosKeys = {
  all: ['loteamentos'] as const,
  lists: () => [...loteamentosKeys.all, 'list'] as const,
  list: (query: ListLoteamentosQuery) =>
    [...loteamentosKeys.lists(), query] as const,
  details: () => [...loteamentosKeys.all, 'detail'] as const,
  detail: (id: string) => [...loteamentosKeys.details(), id] as const,
};

export const quadrasKeys = {
  all: ['quadras'] as const,
  lists: (loteamentoId: string) =>
    [...quadrasKeys.all, loteamentoId, 'list'] as const,
  list: (loteamentoId: string, query: ListQuadrasQuery) =>
    [...quadrasKeys.lists(loteamentoId), query] as const,
};

export function loteamentosListOptions(query: ListLoteamentosQuery) {
  return queryOptions({
    queryKey: loteamentosKeys.list(query),
    queryFn: () => listLoteamentos(query),
    placeholderData: keepPreviousData,
  });
}

export function loteamentoDetailOptions(id: string) {
  return queryOptions({
    queryKey: loteamentosKeys.detail(id),
    queryFn: () => getLoteamento(id),
  });
}

export function quadrasListOptions(
  loteamentoId: string,
  query: ListQuadrasQuery,
) {
  return queryOptions({
    queryKey: quadrasKeys.list(loteamentoId, query),
    queryFn: () => listQuadras(loteamentoId, query),
    placeholderData: keepPreviousData,
  });
}
