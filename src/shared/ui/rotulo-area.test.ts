import { expect, it } from 'vitest';
import { cabeRotuloNaArea } from './rotulo-area';
it('oculta quadras no mapa afastado e quando o nome não cabe no contorno', () => {
  expect(cabeRotuloNaArea(8, 200, 100, 'Quadra 2')).toBe(false);
  expect(cabeRotuloNaArea(18, 10, 10, 'Quadra 2')).toBe(false);
  expect(cabeRotuloNaArea(18, 200, 15, 'Quadra 2')).toBe(false);
  expect(cabeRotuloNaArea(18, 85, 50, 'Quadra com identificação longa')).toBe(
    false,
  );
  expect(cabeRotuloNaArea(18, 120, 50, 'Quadra 2')).toBe(true);
});
