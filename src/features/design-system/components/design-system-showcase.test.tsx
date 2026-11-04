import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { DesignSystemShowcase } from './design-system-showcase';

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

it('não tem violações de acessibilidade', async () => {
  render(<DesignSystemShowcase />);

  await expectNoA11yViolations();
});

it('troca o tema e limpa a escolha ao sair da página', async () => {
  const { unmount } = render(<DesignSystemShowcase />);
  const raiz = document.documentElement;

  await userEvent.click(screen.getByRole('button', { name: 'Escuro' }));
  expect(raiz).toHaveAttribute('data-theme', 'dark');
  expect(screen.getByRole('button', { name: 'Escuro' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await userEvent.click(screen.getByRole('button', { name: 'Claro' }));
  expect(raiz).toHaveAttribute('data-theme', 'light');

  await userEvent.click(screen.getByRole('button', { name: 'Sistema' }));
  expect(raiz).not.toHaveAttribute('data-theme');

  await userEvent.click(screen.getByRole('button', { name: 'Escuro' }));
  unmount();
  expect(raiz).not.toHaveAttribute('data-theme');
});

it('dispara os três tipos de notificação', async () => {
  render(<DesignSystemShowcase />);

  await userEvent.click(
    screen.getByRole('button', { name: 'Toast de sucesso' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Toast de erro' }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Toast informativo' }),
  );

  expect(
    screen.getAllByRole('button', { name: 'Fechar notificação' }),
  ).toHaveLength(3);
});
