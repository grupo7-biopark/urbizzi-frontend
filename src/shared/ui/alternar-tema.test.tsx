import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { AlternarTema } from './alternar-tema';

afterEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.removeItem('urbizzi-tema');
  vi.restoreAllMocks();
});

it('alterna os temas e guarda a preferência', async () => {
  document.documentElement.dataset.theme = 'light';
  const user = userEvent.setup();
  render(<AlternarTema />);
  const botao = screen.getByRole('button', {
    name: 'Alternar tema claro ou escuro',
  });
  await user.click(botao);
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(localStorage.getItem('urbizzi-tema')).toBe('dark');
  await user.click(botao);
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  expect(localStorage.getItem('urbizzi-tema')).toBe('light');
});

it('funciona mesmo quando o armazenamento está bloqueado', async () => {
  document.documentElement.dataset.theme = 'dark';
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Bloqueado');
  });
  render(<AlternarTema />);
  await userEvent.click(
    screen.getByRole('button', { name: 'Alternar tema claro ou escuro' }),
  );
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
});
