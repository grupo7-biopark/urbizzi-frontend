import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';
import type { PlantaVisualizada } from '@/shared/ui/visualizador-planta';

export type PlantaMapa = components['schemas']['PlantaMapaDto'];
export type MarcadorMapa = components['schemas']['MarcadorMapaDto'];
export type StatusLoteMapa = MarcadorMapa['status'];
export type ConsultaMapa = Omit<
  NonNullable<paths['/v1/mapa']['get']['parameters']['query']>,
  'page' | 'pageSize'
>;

/** O máximo que a API aceita por página. */
const POR_PAGINA = 100;

function getPaginaDoMapa(query: ConsultaMapa, page: number) {
  return unwrap(
    api.GET('/v1/mapa', {
      params: { query: { ...query, page, pageSize: POR_PAGINA } },
    }),
  );
}

/** O mapa mostra todos os lotes: percorre as páginas, uma de cada vez. */
export async function getMapa(query: ConsultaMapa) {
  const primeira = await getPaginaDoMapa(query, 1);
  const marcadores = [...primeira.marcadores.data];

  for (let page = 2; page <= primeira.marcadores.meta.totalPages; page += 1) {
    const { marcadores: seguinte } = await getPaginaDoMapa(query, page);
    marcadores.push(...seguinte.data);
  }

  return { planta: primeira.planta, marcadores };
}

export function listLoteamentosDoMapa() {
  return unwrap(
    api.GET('/v1/loteamentos', {
      params: { query: { page: 1, pageSize: POR_PAGINA } },
    }),
  );
}

/**
 * Os metadados só vêm depois do processamento, e só uma planta pronta fica ativa.
 * Sem eles, não há o que mostrar. Os tiles passam pelo proxy, com a mesma origem.
 */
export function toPlantaVisualizada({
  nome,
  larguraPx,
  alturaPx,
  maxZoom,
  tamanhoTile,
  tilesUrl,
}: PlantaMapa): PlantaVisualizada | null {
  if (
    larguraPx === null ||
    alturaPx === null ||
    maxZoom === null ||
    tamanhoTile === null
  ) {
    return null;
  }

  return {
    nome,
    larguraPx,
    alturaPx,
    maxZoom,
    tamanhoTile,
    tilesUrl: `/api/backend${tilesUrl}`,
  };
}
