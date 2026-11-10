import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import {
  getEditorDeMarcadores,
  getMapa,
  getQuadraDoMapa,
  listLoteamentosDoMapa,
  listLotesSemMarcador,
  type ConsultaMapa,
} from './mapa.api';

export const mapaKeys = {
  all: ['mapa'] as const,
  consultas: () => [...mapaKeys.all, 'consulta'] as const,
  consulta: (query: ConsultaMapa) =>
    [...mapaKeys.all, 'consulta', query] as const,
  loteamentos: () => [...mapaKeys.all, 'loteamentos'] as const,
  editor: () => [...mapaKeys.all, 'editor'] as const,
  lotesSemMarcador: (plantaId: string, loteamentoId?: string) =>
    [...mapaKeys.all, 'lotes-sem-marcador', plantaId, loteamentoId] as const,
  quadra: (id: string) => [...mapaKeys.all, 'quadra', id] as const,
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

export function editorDeMarcadoresOptions() {
  return queryOptions({
    queryKey: mapaKeys.editor(),
    queryFn: getEditorDeMarcadores,
  });
}

export function lotesSemMarcadorOptions(
  plantaId: string,
  loteamentoId?: string,
) {
  return queryOptions({
    queryKey: mapaKeys.lotesSemMarcador(plantaId, loteamentoId),
    queryFn: () => listLotesSemMarcador(plantaId, loteamentoId),
    placeholderData: keepPreviousData,
  });
}

export function quadraDoMapaOptions(id: string) {
  return queryOptions({
    queryKey: mapaKeys.quadra(id),
    queryFn: () => getQuadraDoMapa(id),
  });
}
