import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { listPlantas, type ListPlantasQuery, type Planta } from './plantas.api';

export const INTERVALO_ATUALIZACAO_MS = 3000;

export const plantasKeys = {
  all: ['plantas'] as const,
  lists: () => [...plantasKeys.all, 'list'] as const,
  list: (query: ListPlantasQuery) => [...plantasKeys.lists(), query] as const,
};

/** Só consulta de novo enquanto houver planta na fila ou em processamento. */
export function getIntervaloAtualizacao(plantas: Planta[] = []) {
  const emAndamento = plantas.some(
    ({ status }) => status === 'ENVIADA' || status === 'PROCESSANDO',
  );

  return emAndamento ? INTERVALO_ATUALIZACAO_MS : false;
}

export function plantasListOptions(query: ListPlantasQuery) {
  return queryOptions({
    queryKey: plantasKeys.list(query),
    queryFn: () => listPlantas(query),
    placeholderData: keepPreviousData,
    refetchInterval: ({ state }) => getIntervaloAtualizacao(state.data?.data),
  });
}
