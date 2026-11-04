// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
const rootBlock = /:root \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
const tokens = new Map(
  [...rootBlock.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [
    match[1],
    match[2].trim(),
  ]),
);

type Tema = 'claro' | 'escuro';

function resolve(name: string, tema: Tema): string {
  const value = tokens.get(name);

  if (!value) {
    throw new Error(`Token inexistente: ${name}`);
  }

  const lightDark = /^light-dark\(\s*(.+?),\s*(.+?)\s*\)$/.exec(value);
  const chosen = lightDark ? lightDark[tema === 'claro' ? 1 : 2] : value;
  const reference = /^var\(--([\w-]+)\)$/.exec(chosen);

  return reference ? resolve(reference[1], tema) : chosen;
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [claro, escuro] = [luminance(a), luminance(b)].toSorted(
    (x, y) => y - x,
  );

  return (claro + 0.05) / (escuro + 0.05);
}

const STATUS = ['disponivel', 'reservado', 'vendido', 'bloqueado'];

const TEXTO: [string, string][] = [
  ['ink', 'surface'],
  ['ink', 'surface-alt'],
  ['ink-muted', 'surface'],
  ['on-accent', 'accent'],
  ['danger', 'surface'],
  ['on-danger', 'danger'],
  ...STATUS.map((status): [string, string] => [
    `on-status-${status}`,
    `status-${status}`,
  ]),
];

// Bordas de controle, foco e cores que precisam se destacar do fundo (WCAG 1.4.11).
const NAO_TEXTO: [string, string][] = [
  ['ink-muted', 'surface'],
  ['ink', 'surface'],
  ['ink', 'accent'],
  ['accent', 'surface'],
  ['danger', 'surface'],
  ...STATUS.map((status): [string, string] => [`status-${status}`, 'surface']),
];

describe('tokens', () => {
  it('mantém as cores exatas do manual de marca', () => {
    expect(
      Object.fromEntries(
        [
          'laranja',
          'preto',
          'branco',
          'prata',
          'cinza-oliva',
          'cinza-carvao',
        ].map((nome) => [nome, tokens.get(nome)?.toUpperCase()]),
      ),
    ).toEqual({
      laranja: '#EE6017',
      preto: '#000000',
      branco: '#FFFFFF',
      prata: '#C5C7C7',
      'cinza-oliva': '#8F9289',
      'cinza-carvao': '#545759',
    });
  });

  it('calcula o contraste como o manual', () => {
    expect(contrast('#000000', '#EE6017')).toBeCloseTo(6.32, 1);
    expect(contrast('#EE6017', '#FFFFFF')).toBeCloseTo(3.32, 1);
    expect(contrast('#545759', '#FFFFFF')).toBeCloseTo(7.28, 1);
  });

  it('usa texto preto sobre laranja nos dois temas', () => {
    for (const tema of ['claro', 'escuro'] as const) {
      expect(resolve('on-accent', tema)).toBe('#000000');
    }
  });

  describe.each(['claro', 'escuro'] as const)('tema %s', (tema) => {
    it.each(TEXTO)('%s sobre %s atinge 4,5:1', (frente, fundo) => {
      expect(
        contrast(resolve(frente, tema), resolve(fundo, tema)),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it.each(NAO_TEXTO)('%s sobre %s atinge 3:1', (frente, fundo) => {
      expect(
        contrast(resolve(frente, tema), resolve(fundo, tema)),
      ).toBeGreaterThanOrEqual(3);
    });
  });

  // Documenta por que a regra existe em docs/ui.md: se passar a valer, a regra pode cair.
  it.each(['claro', 'escuro'] as const)(
    'ink-muted sobre surface-alt fica abaixo de 4,5:1 no tema %s',
    (tema) => {
      expect(
        contrast(resolve('ink-muted', tema), resolve('surface-alt', tema)),
      ).toBeLessThan(4.5);
    },
  );
});
