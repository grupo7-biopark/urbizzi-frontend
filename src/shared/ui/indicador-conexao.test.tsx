import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EstadoConexao } from '@/shared/api/use-event-source';
import { expectNoA11yViolations } from '@/test/a11y';
import { IndicadorConexao } from './indicador-conexao';

const CASOS: [EstadoConexao, string][] = [
  ['conectando', 'Conectando…'],
  ['ao-vivo', 'Ao vivo'],
  ['reconectando', 'Reconectando…'],
];

describe('IndicadorConexao', () => {
  it.each(CASOS)('mostra o estado %s como "%s"', (estado, rotulo) => {
    render(<IndicadorConexao estado={estado} />);

    expect(screen.getByRole('status')).toHaveTextContent(rotulo);
  });

  it('não tem violações de acessibilidade', async () => {
    render(<IndicadorConexao estado="ao-vivo" />);

    await expectNoA11yViolations();
  });
});
