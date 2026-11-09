import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { listHistorico, type HistoricoQuery } from './historico.api';
export const historicoKeys = { all: ['historico'] as const };
export function historicoListOptions(query: HistoricoQuery) {
  return queryOptions({
    queryKey: [...historicoKeys.all, 'list', query],
    queryFn: () => listHistorico(query),
    placeholderData: keepPreviousData,
  });
}
