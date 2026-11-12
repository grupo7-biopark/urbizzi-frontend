import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import {
  listMinhasPropostas,
  listPendentes,
  getPendencia,
  type PendentesQuery,
  type MinhasPropostasQuery,
} from './propostas.api';

export const propostasKeys = { all: ['propostas'] as const };

export function pendentesOptions(query: PendentesQuery) {
  return queryOptions({
    queryKey: [...propostasKeys.all, 'pendentes', query],
    queryFn: () => listPendentes(query),
    placeholderData: keepPreviousData,
    refetchInterval: 30000,
  });
}

export function pendenciaOptions(id: string) {
  return queryOptions({
    queryKey: [...propostasKeys.all, 'pendencia', id],
    queryFn: () => getPendencia(id),
  });
}

export function minhasPropostasOptions(query: MinhasPropostasQuery) {
  return queryOptions({
    queryKey: [...propostasKeys.all, 'minhas', query],
    queryFn: () => listMinhasPropostas(query),
    placeholderData: keepPreviousData,
    refetchInterval: 60000,
  });
}
