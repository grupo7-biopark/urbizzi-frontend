import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LinhaDoTempo } from './linha-do-tempo';
import { formatDataHora } from './datas';
import { textoTempoRestante } from './tempo-restante';
describe('Linha do tempo e prazos', () => {
  it('mostra eventos e autor sem interpretar HTML', () => {
    render(
      <LinhaDoTempo
        itens={[
          {
            id: '1',
            data: '2026-11-09T12:00:00Z',
            titulo: 'Reserva criada',
            autor: 'Pessoa fictícia',
            detalhe: '<script>texto</script>',
          },
        ]}
      />,
    );
    expect(screen.getByRole('list')).toBeVisible();
    expect(screen.getByText('<script>texto</script>')).toBeVisible();
  });
  it('mostra vazio e datas inválidas', () => {
    render(<LinhaDoTempo itens={[]} />);
    expect(screen.getByText('Nenhuma alteração registrada.')).toBeVisible();
    expect(formatDataHora('x')).toBe('Data não informada');
  });
  it('calcula horas, dias e prazo encerrado', () => {
    const agora = Date.parse('2026-11-09T12:00:00Z');
    expect(textoTempoRestante('x', agora)).toBe('Prazo não informado');
    expect(textoTempoRestante('2026-11-09T11:00:00Z', agora)).toBe(
      'Prazo encerrado',
    );
    expect(textoTempoRestante('2026-11-09T12:30:00Z', agora)).toContain(
      '1 hora',
    );
    expect(textoTempoRestante('2026-11-11T14:00:00Z', agora)).toContain(
      '2 dias',
    );
  });
});
