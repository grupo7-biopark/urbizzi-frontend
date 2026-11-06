import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';
import type { PlantaVisualizada } from '@/shared/ui/visualizador-planta';

export type PlantaMapa = components['schemas']['PlantaMapaDto'];
export type MarcadorMapa = components['schemas']['MarcadorMapaDto'];
export type StatusLoteMapa = MarcadorMapa['status'];
export type NovoMarcador = components['schemas']['CreateMarcadorDto'];
export type LoteSemMarcador = components['schemas']['LoteSemMarcadorDto'];
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

/** Percorre as páginas de uma lista, uma de cada vez. */
async function listarTudo<Item>(
  getPagina: (
    page: number,
  ) => Promise<{ data: Item[]; meta: { totalPages: number } }>,
) {
  const primeira = await getPagina(1);
  const itens = [...primeira.data];

  for (let page = 2; page <= primeira.meta.totalPages; page += 1) {
    itens.push(...(await getPagina(page)).data);
  }

  return itens;
}

/** O mapa traz os nomes do lote, e só a lista de marcadores traz o `revisar`. */
export async function getEditorDeMarcadores() {
  const { planta, marcadores } = await getMapa({});
  const salvos = await listarTudo((page) =>
    unwrap(
      api.GET('/v1/plantas/{plantaId}/marcadores', {
        params: {
          path: { plantaId: planta.id },
          query: { page, pageSize: POR_PAGINA },
        },
      }),
    ),
  );
  const aRevisar = new Set(
    salvos.filter(({ revisar }) => revisar).map(({ id }) => id),
  );

  return {
    planta,
    marcadores: marcadores.map((marcador) => ({
      ...marcador,
      revisar: aRevisar.has(marcador.id),
    })),
  };
}

export type MarcadorDoEditor = Awaited<
  ReturnType<typeof getEditorDeMarcadores>
>['marcadores'][number];

export function listLotesSemMarcador(plantaId: string, loteamentoId?: string) {
  return listarTudo((page) =>
    unwrap(
      api.GET('/v1/plantas/{plantaId}/lotes-sem-marcador', {
        params: {
          path: { plantaId },
          query: {
            page,
            pageSize: POR_PAGINA,
            ...(loteamentoId ? { loteamentoId } : {}),
          },
        },
      }),
    ),
  );
}

export function getQuadraDoMapa(id: string) {
  return unwrap(api.GET('/v1/quadras/{id}', { params: { path: { id } } }));
}

/** Tudo ou nada: a API grava cada lote de até 500 em uma transação. */
export function createMarcadores(plantaId: string, marcadores: NovoMarcador[]) {
  return unwrap(
    api.POST('/v1/plantas/{plantaId}/marcadores/lote', {
      params: { path: { plantaId } },
      body: { marcadores },
    }),
  );
}

export function moverMarcador(
  plantaId: string,
  id: string,
  body: { x: number; y: number },
) {
  return unwrap(
    api.PATCH('/v1/plantas/{plantaId}/marcadores/{id}', {
      params: { path: { plantaId, id } },
      body,
    }),
  );
}

export function deleteMarcador(plantaId: string, id: string) {
  return unwrap(
    api.DELETE('/v1/plantas/{plantaId}/marcadores/{id}', {
      params: { path: { plantaId, id } },
    }),
  );
}

export function revisarMarcador(plantaId: string, id: string) {
  return unwrap(
    api.POST('/v1/plantas/{plantaId}/marcadores/{id}/revisar', {
      params: { path: { plantaId, id } },
    }),
  );
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
