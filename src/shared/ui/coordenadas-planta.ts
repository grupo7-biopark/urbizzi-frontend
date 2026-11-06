/** Posição na planta, de 0 a 1, com a origem no canto superior esquerdo, como na API. */
export type PontoNormalizado = { x: number; y: number };

export type DimensoesPlanta = {
  larguraPx: number;
  alturaPx: number;
  maxZoom: number;
};

/** `[lat, lng]`, o formato que o Leaflet aceita. */
export type LatLng = [number, number];

/**
 * No `CRS.Simple`, um pixel no zoom `z` vale `1 / 2^z` unidade, e `lat` cresce para
 * cima. A imagem tem o tamanho original no zoom máximo. Assim, a posição depende só
 * das dimensões da planta, e não do zoom atual.
 */
export function normalizadoParaLatLng(
  { x, y }: PontoNormalizado,
  { larguraPx, alturaPx, maxZoom }: DimensoesPlanta,
): LatLng {
  const escala = 2 ** maxZoom;

  // `0 - valor`, e não `-valor`: evita o `-0`, que atrapalha comparações.
  return [0 - (y * alturaPx) / escala, (x * larguraPx) / escala];
}

export function latLngParaNormalizado(
  [lat, lng]: LatLng,
  { larguraPx, alturaPx, maxZoom }: DimensoesPlanta,
): PontoNormalizado {
  const escala = 2 ** maxZoom;

  return { x: (lng * escala) / larguraPx, y: (0 - lat * escala) / alturaPx };
}

export function estaNaPlanta({ x, y }: PontoNormalizado) {
  return x >= 0 && x <= 1 && y >= 0 && y <= 1;
}

/** O ponto mais próximo dentro da imagem: a API só aceita coordenadas de 0 a 1. */
export function limitarAPlanta({ x, y }: PontoNormalizado): PontoNormalizado {
  return {
    x: Math.min(Math.max(x, 0), 1),
    y: Math.min(Math.max(y, 0), 1),
  };
}

/** Canto inferior esquerdo e superior direito da imagem. */
export function limitesDaPlanta(dimensoes: DimensoesPlanta): [LatLng, LatLng] {
  return [
    normalizadoParaLatLng({ x: 0, y: 1 }, dimensoes),
    normalizadoParaLatLng({ x: 1, y: 0 }, dimensoes),
  ];
}
