import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { renderWithQuery } from '@/test/render';
import { DesignSystemShowcase } from './design-system-showcase';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

it('não tem violações de acessibilidade', async () => {
  renderWithQuery(<DesignSystemShowcase />);
  await screen.findByRole('table', { name: 'Lotes de exemplo' });

  await expectNoA11yViolations();
});

it('troca o tema e limpa a escolha ao sair da página', async () => {
  const { unmount } = renderWithQuery(<DesignSystemShowcase />);
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
  renderWithQuery(<DesignSystemShowcase />);

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
