import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import {
  getLoteamento,
  listLoteamentos,
  type ListLoteamentosQuery,
} from './loteamentos.api';

export const loteamentosKeys = {
  all: ['loteamentos'] as const,
  lists: () => [...loteamentosKeys.all, 'list'] as const,
  list: (query: ListLoteamentosQuery) =>
    [...loteamentosKeys.lists(), query] as const,
  details: () => [...loteamentosKeys.all, 'detail'] as const,
  detail: (id: string) => [...loteamentosKeys.details(), id] as const,
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
