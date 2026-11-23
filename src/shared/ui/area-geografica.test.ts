import { expect, it } from 'vitest';
import { estimarAreaM2 } from './area-geografica';

it('estima um retângulo no equador em metros quadrados nas duas orientações', () => {
  const vertices = [
    [0, 0],
    [0, 0.001],
    [0.001, 0.001],
    [0.001, 0],
  ];
  expect(estimarAreaM2(vertices)).toBeCloseTo(12364.35, 2);
  expect(estimarAreaM2(vertices.toReversed())).toBe(estimarAreaM2(vertices));
});

it('considera a latitude e ignora o ponto de fechamento repetido', () => {
  const vertices = [
    [60, 0],
    [60, 0.001],
    [60.001, 0.001],
    [60.001, 0],
  ];
  expect(estimarAreaM2(vertices)).toBeCloseTo(6182.08, 1);
  expect(estimarAreaM2([...vertices, vertices[0]])).toBe(
    estimarAreaM2(vertices),
  );
});

it.each([
  null,
  [],
  [
    [0, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  [
    [NaN, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [86, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 179],
    [0, -179],
    [1, -179],
  ],
])('não inventa área para contorno incompleto ou inválido: %j', (vertices) => {
  expect(estimarAreaM2(vertices)).toBeNull();
});
