import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TempoRestante } from './tempo-restante';

describe('TempoRestante', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-09T12:00:00.000Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('mostra dias e horas sem destaque fora das últimas 24 horas', () => {
    render(<TempoRestante vencimento="2026-11-11T15:00:00.000Z" />);
    expect(screen.getByText('Vence em 2 dias e 3 horas')).not.toHaveClass(
      'text-danger',
    );
  });

  it('destaca prazo próximo e atualiza até o vencimento sem recarregar', () => {
    render(<TempoRestante vencimento="2026-11-09T12:01:00.000Z" />);
    expect(screen.getByText('Vence em até 1 hora')).toHaveClass('text-danger');
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('Prazo encerrado')).toBeVisible();
  });

  it('trata data inválida', () => {
    render(<TempoRestante vencimento="" />);
    expect(screen.getByText('Prazo não informado')).toBeVisible();
  });
});
