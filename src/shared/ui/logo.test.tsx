import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getLogoAsset, Logo, LogoSimbolo } from './logo';

const ARQUITETURAS = ['horizontal', 'vertical'] as const;
const ASSINATURAS = ['marca', 'tagline', 'wordmark'] as const;
const FUNDOS = ['claro', 'escuro', 'laranja'] as const;

const COMBINACOES = ARQUITETURAS.flatMap((arquitetura) =>
  ASSINATURAS.flatMap((assinatura) =>
    FUNDOS.map((fundo) => [arquitetura, assinatura, fundo] as const),
  ),
);

function readSvg(src: string) {
  return readFileSync(join(process.cwd(), 'public', src), 'utf8');
}

describe('getLogoAsset', () => {
  it.each(COMBINACOES)(
    '%s, %s, fundo %s aponta para um SVG existente com o tamanho certo',
    (arquitetura, assinatura, fundo) => {
      const { src, width, height } = getLogoAsset(
        arquitetura,
        assinatura,
        fundo,
      );
      const svg = readSvg(src);

      expect(svg).toContain(`width="${width}"`);
      expect(svg).toContain(`height="${height}"`);
    },
  );

  it.each(
    ARQUITETURAS.flatMap((arquitetura) =>
      ASSINATURAS.map((assinatura) => [arquitetura, assinatura] as const),
    ),
  )('sobre laranja, %s %s usa só preto', (arquitetura, assinatura) => {
    const svg = readSvg(getLogoAsset(arquitetura, assinatura, 'laranja').src);
    const cores = new Set(svg.match(/#[0-9a-fA-F]{6}/g));

    expect([...cores]).toEqual(['#000000']);
  });

  it('usa a versão principal colorida sobre branco e sobre preto', () => {
    expect(getLogoAsset('horizontal', 'marca', 'claro').src).toBe(
      '/brand/urbizzi-horizontal-primary.svg',
    );
    expect(getLogoAsset('vertical', 'marca', 'escuro').src).toBe(
      '/brand/urbizzi-vertical-primary-dark.svg',
    );
  });
});

describe('Logo', () => {
  it('exibe a versão do fundo informado', () => {
    render(<Logo variant="laranja" assinatura="tagline" />);

    expect(screen.getByRole('img', { name: 'Urbizzi' })).toHaveAttribute(
      'src',
      '/brand/urbizzi-horizontal-tagline-black.svg',
    );
  });

  it('no modo tema, traz as versões para fundo claro e escuro', () => {
    render(<Logo />);

    const [claro, escuro] = screen.getAllByRole('img', { name: 'Urbizzi' });

    expect(claro).toHaveAttribute(
      'src',
      '/brand/urbizzi-horizontal-wordmark-orange.svg',
    );
    expect(claro).toHaveClass('dark:hidden');
    expect(escuro).toHaveAttribute(
      'src',
      '/brand/urbizzi-horizontal-wordmark-white.svg',
    );
    expect(escuro).toHaveClass('hidden', 'dark:block');
  });

  it('exibe o símbolo com texto alternativo próprio', () => {
    render(<LogoSimbolo alt="Início" />);

    expect(screen.getByRole('img', { name: 'Início' })).toHaveAttribute(
      'src',
      '/brand/urbizzi-symbol-orange.svg',
    );
  });
});
