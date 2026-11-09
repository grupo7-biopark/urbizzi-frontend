import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import {
  getLote,
  getLoteDetalhe,
  getLoteamentoDoLote,
  getQuadraDoLote,
  listLoteamentosOpcoes,
  listLotes,
  listQuadrasOpcoes,
  type ListLotesQuery,
} from './lotes.api';

export const lotesKeys = {
  all: ['lotes'] as const,
  lists: () => [...lotesKeys.all, 'list'] as const,
  list: (query: ListLotesQuery) => [...lotesKeys.lists(), query] as const,
  details: () => [...lotesKeys.all, 'detail'] as const,
  detail: (id: string) => [...lotesKeys.details(), id] as const,
  loteamento: (id: string) => [...lotesKeys.all, 'loteamento', id] as const,
  quadra: (id: string) => [...lotesKeys.all, 'quadra', id] as const,
  opcoesLoteamentos: () => [...lotesKeys.all, 'opcoes-loteamentos'] as const,
  opcoesQuadras: (loteamentoId: string) =>
    [...lotesKeys.all, 'opcoes-quadras', loteamentoId] as const,
};

export function lotesListOptions(query: ListLotesQuery) {
  return queryOptions({
    queryKey: lotesKeys.list(query),
    queryFn: () => listLotes(query),
    placeholderData: keepPreviousData,
  });
}

export function loteDetailOptions(id: string) {
  return queryOptions({
    queryKey: lotesKeys.detail(id),
    queryFn: () => getLote(id),
  });
}

export function loteamentoDoLoteOptions(id: string) {
  return queryOptions({
    queryKey: lotesKeys.loteamento(id),
    queryFn: () => getLoteamentoDoLote(id),
  });
}

export function quadraDoLoteOptions(id: string) {
  return queryOptions({
    queryKey: lotesKeys.quadra(id),
    queryFn: () => getQuadraDoLote(id),
  });
}

export function loteamentosOpcoesOptions() {
  return queryOptions({
    queryKey: lotesKeys.opcoesLoteamentos(),
    queryFn: listLoteamentosOpcoes,
  });
}

/** Sem loteamento escolhido, não há o que buscar. */
export function quadrasOpcoesOptions(loteamentoId: string | undefined) {
  return queryOptions({
    queryKey: lotesKeys.opcoesQuadras(loteamentoId ?? ''),
    queryFn: () => listQuadrasOpcoes(loteamentoId ?? ''),
    enabled: Boolean(loteamentoId),
  });
}

export function loteDetalheCompletoOptions(id: string) {
  return queryOptions({
    queryKey: [...lotesKeys.detail(id), 'completo'],
    queryFn: () => getLoteDetalhe(id),
  });
}
