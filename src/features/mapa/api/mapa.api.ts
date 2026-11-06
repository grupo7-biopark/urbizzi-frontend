import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import type { PlantaVisualizada } from '@/shared/ui/visualizador-planta';

export type PlantaAtiva = components['schemas']['PlantaAtivaDto'];

export function getPlantaAtiva() {
  return unwrap(api.GET('/v1/plantas/ativa'));
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
}: PlantaAtiva): PlantaVisualizada | null {
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
