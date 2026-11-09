import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import {
  listMinhasPropostas,
  type MinhasPropostasQuery,
} from './propostas.api';

export const propostasKeys = { all: ['propostas'] as const };

export function minhasPropostasOptions(query: MinhasPropostasQuery) {
  return queryOptions({
    queryKey: [...propostasKeys.all, 'minhas', query],
    queryFn: () => listMinhasPropostas(query),
    placeholderData: keepPreviousData,
    refetchInterval: 60000,
  });
}
