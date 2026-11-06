import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { getMapa, listLoteamentosDoMapa, type ConsultaMapa } from './mapa.api';

export const mapaKeys = {
  all: ['mapa'] as const,
  consulta: (query: ConsultaMapa) =>
    [...mapaKeys.all, 'consulta', query] as const,
  loteamentos: () => [...mapaKeys.all, 'loteamentos'] as const,
};

/** Mantém o mapa na tela ao trocar de filtro, sem voltar ao carregamento. */
export function mapaOptions(query: ConsultaMapa) {
  return queryOptions({
    queryKey: mapaKeys.consulta(query),
    queryFn: () => getMapa(query),
    placeholderData: keepPreviousData,
  });
}

export function loteamentosDoMapaOptions() {
  return queryOptions({
    queryKey: mapaKeys.loteamentos(),
    queryFn: listLoteamentosDoMapa,
  });
}
