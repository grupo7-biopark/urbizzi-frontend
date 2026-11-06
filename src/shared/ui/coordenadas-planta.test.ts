import L from 'leaflet';
import { describe, expect, it } from 'vitest';
import {
  estaNaPlanta,
  latLngParaNormalizado,
  limitarAPlanta,
  limitesDaPlanta,
  normalizadoParaLatLng,
} from './coordenadas-planta';

const PLANTA = { larguraPx: 13212, alturaPx: 10446, maxZoom: 6 };

describe('normalizadoParaLatLng', () => {
  it('coloca a origem no canto superior esquerdo', () => {
    expect(normalizadoParaLatLng({ x: 0, y: 0 }, PLANTA)).toEqual([0, 0]);
  });

  it('coloca (1, 1) no canto inferior direito, em unidades do zoom máximo', () => {
    expect(normalizadoParaLatLng({ x: 1, y: 1 }, PLANTA)).toEqual([
      -10446 / 64,
      13212 / 64,
    ]);
  });

  it.each([0, 1, 3, 6])(
    'cai no mesmo pixel da imagem em qualquer zoom (zoom %i)',
    (zoom) => {
      const [lat, lng] = normalizadoParaLatLng({ x: 0.25, y: 0.75 }, PLANTA);

      const pixel = L.CRS.Simple.latLngToPoint(L.latLng(lat, lng), zoom);
      const fator = 2 ** (PLANTA.maxZoom - zoom);

      expect(pixel.x * fator).toBeCloseTo(0.25 * PLANTA.larguraPx);
      expect(pixel.y * fator).toBeCloseTo(0.75 * PLANTA.alturaPx);
    },
  );
});

describe('latLngParaNormalizado', () => {
  it.each([
    [0, 0],
    [1, 1],
    [0.25, 0.75],
    [0.123456, 0.987654],
  ])('volta ao ponto de origem (%f, %f)', (x, y) => {
    const volta = latLngParaNormalizado(
      normalizadoParaLatLng({ x, y }, PLANTA),
      PLANTA,
    );

    expect(volta.x).toBeCloseTo(x, 10);
    expect(volta.y).toBeCloseTo(y, 10);
  });
});

describe('estaNaPlanta', () => {
  it.each([
    [{ x: 0, y: 0 }, true],
    [{ x: 1, y: 1 }, true],
    [{ x: 0.5, y: 0.5 }, true],
    [{ x: -0.01, y: 0.5 }, false],
    [{ x: 0.5, y: 1.01 }, false],
  ])('%j: %s', (ponto, esperado) => {
    expect(estaNaPlanta(ponto)).toBe(esperado);
  });
});

describe('limitarAPlanta', () => {
  it('mantém o que já está dentro', () => {
    expect(limitarAPlanta({ x: 0.2, y: 0.8 })).toEqual({ x: 0.2, y: 0.8 });
  });

  it('traz para a borda o que está fora', () => {
    expect(limitarAPlanta({ x: -0.5, y: 1.5 })).toEqual({ x: 0, y: 1 });
  });
});

describe('limitesDaPlanta', () => {
  it('cobre a imagem inteira', () => {
    expect(limitesDaPlanta(PLANTA)).toEqual([
      [-10446 / 64, 0],
      [0, 13212 / 64],
    ]);
  });

  it('o canto inferior direito é o tamanho original no zoom máximo', () => {
    const [[lat], [, lng]] = limitesDaPlanta(PLANTA);

    expect(
      L.CRS.Simple.latLngToPoint(L.latLng(lat, lng), PLANTA.maxZoom),
    ).toMatchObject({ x: PLANTA.larguraPx, y: PLANTA.alturaPx });
  });
});
