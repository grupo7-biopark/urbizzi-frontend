import { expect, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';

/** Entra pela tela de login e espera o menu do usuário, como uma pessoa faria. */
export async function entrar(page: Page, email = EMAIL, senha = SENHA) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

/** Quantos pixels o documento passa da largura visível; zero ou menos está ok. */
export function excessoHorizontal(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
}
