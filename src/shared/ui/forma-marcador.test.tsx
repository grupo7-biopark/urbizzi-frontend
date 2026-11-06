import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormaMarcadorIcone, getVerticesDaForma } from './forma-marcador';

const CENTRO = { x: 10, y: 20 };

describe('getVerticesDaForma', () => {
  it('monta o quadrado em volta do centro', () => {
    expect(getVerticesDaForma('quadrado', CENTRO, 2)).toEqual([
      { x: 8, y: 18 },
      { x: 12, y: 18 },
      { x: 12, y: 22 },
      { x: 8, y: 22 },
    ]);
  });

  it('monta o triângulo com a ponta para cima', () => {
    expect(getVerticesDaForma('triangulo', CENTRO, 2)).toEqual([
      { x: 10, y: 18 },
      { x: 12, y: 22 },
      { x: 8, y: 22 },
    ]);
  });

  it('monta o losango com os vértices nos eixos', () => {
    expect(getVerticesDaForma('losango', CENTRO, 2)).toEqual([
      { x: 10, y: 18 },
      { x: 12, y: 20 },
      { x: 10, y: 22 },
      { x: 8, y: 20 },
    ]);
  });
});

describe('FormaMarcadorIcone', () => {
  it('desenha o círculo', () => {
    const { container } = render(
      <FormaMarcadorIcone forma="circulo" cor="--status-disponivel" />,
    );

    expect(container.querySelector('circle')).toHaveStyle({
      fill: 'var(--status-disponivel)',
    });
  });

  it('desenha as demais como polígono, escondidas do leitor de tela', () => {
    const { container } = render(
      <FormaMarcadorIcone forma="quadrado" cor="--status-vendido" />,
    );

    expect(container.querySelector('polygon')).toHaveAttribute(
      'points',
      '2,2 14,2 14,14 2,14',
    );
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
