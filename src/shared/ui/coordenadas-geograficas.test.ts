import { describe, it, expect } from 'vitest';
import { lerCoordenadas, formatarCoordenadas } from './coordenadas-geograficas';
describe('Coordenadas geográficas', () => {
  it('aceita pontos decimais, separador em branco e vírgula decimal com ponto e vírgula', () => {
    expect(lerCoordenadas('-24.7, -53.7\n-24.8 -53.7\n-24,8; -53,8')).toEqual([
      [-24.7, -53.7],
      [-24.8, -53.7],
      [-24.8, -53.8],
    ]);
  });
  it('formata a precisão do editor', () => {
    expect(formatarCoordenadas([[0, 1]])).toBe('0.0000000, 1.0000000');
  });
  it('aceita até 500 pontos e rejeita o próximo', () => {
    const linhas = Array.from(
      { length: 500 },
      (_, i) => `${-24.7 + i / 100000}, -53.7`,
    );
    expect(lerCoordenadas(linhas.join('\n'))).toHaveLength(500);
    expect(() =>
      lerCoordenadas([...linhas, '-24.8, -53.8'].join('\n')),
    ).toThrow('Informe de 3 a 500');
  });
  it.each([
    '',
    '0,0\n1,1',
    'a,0\n0,1\n1,0',
    '86,0\n0,1\n1,0',
    '0,181\n0,1\n1,0',
    '0;\n0;1\n1;0',
    '0,0,0\n0,1\n1,0',
    Array(501).fill('0,0').join('\n'),
  ])('rejeita coordenadas inválidas %#', (input) => {
    expect(() => lerCoordenadas(input)).toThrow(/Informe|Confira/);
  });
});
