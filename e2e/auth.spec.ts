import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// Os padrões são os da API falsa (e2e/support/fake-api.mjs). Para rodar contra o
// backend real, informe E2E_API_URL, E2E_EMAIL e E2E_SENHA (docs/testing.md).
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const ACCESS_COOKIE = 'urbizzi_access';
const REFRESH_COOKIE = 'urbizzi_refresh';

async function preencherLogin(page: Page, senha = SENHA) {
  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

async function entrar(page: Page) {
  await page.goto('/login');
  await preencherLogin(page);
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

async function trocarCookie(
  context: BrowserContext,
  page: Page,
  name: string,
  value: string,
) {
  const cookies = await context.cookies();
  const cookie = cookies.find((item) => item.name === name);
  expect(cookie).toBeDefined();
  await context.addCookies([{ ...cookie!, value }]);
  await page.evaluate(() => undefined);
}

test('leva ao login sem sessão e, ao entrar, volta à página de destino', async ({
  page,
  context,
}) => {
  await page.goto('/?origem=teste');
  await expect(page).toHaveURL('/login?redirect=%2F%3Forigem%3Dteste');

  await preencherLogin(page);

  await expect(page).toHaveURL('/?origem=teste');
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();

  // Nenhum token fica ao alcance do JavaScript da página.
  expect(await page.evaluate(() => document.cookie)).not.toContain('urbizzi');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  const cookies = await context.cookies();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    expect(cookies.find((cookie) => cookie.name === name)).toMatchObject({
      httpOnly: true,
      sameSite: 'Lax',
    });
  }
});

test('mostra a mensagem de senha errada e continua no login', async ({
  page,
}) => {
  await page.goto('/login');

  await preencherLogin(page, 'senha-errada-123');

  // Só no formulário: o Next mantém o próprio `role="alert"` para anunciar rotas.
  await expect(page.locator('form').getByRole('alert')).toHaveText(
    'E-mail ou senha incorretos, ou usuário inativo.',
  );
  await expect(page).toHaveURL('/login');
});

test('sai da conta, apaga os cookies e tira quem tem sessão do login', async ({
  page,
  context,
}) => {
  await entrar(page);

  await page.goto('/login');
  await expect(page).toHaveURL('/');

  await page.getByRole('button', { name: 'Sair' }).click();

  await expect(page).toHaveURL('/login');
  const nomes = (await context.cookies()).map((cookie) => cookie.name);
  expect(nomes).not.toContain(ACCESS_COOKIE);
  expect(nomes).not.toContain(REFRESH_COOKIE);

  await page.goto('/');
  await expect(page).toHaveURL('/login');
});

test('renova com o access token inválido e, sem refresh válido, volta ao login', async ({
  page,
  context,
}) => {
  await entrar(page);

  // Abrir a página renova no servidor, sem o usuário perceber.
  await trocarCookie(context, page, ACCESS_COOKIE, 'token-vencido');
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();

  // No uso da tela, o proxy renova uma vez só, mesmo com chamadas simultâneas.
  await trocarCookie(context, page, ACCESS_COOKIE, 'token-vencido');
  const respostas = await page.evaluate(() =>
    Promise.all(
      Array.from({ length: 5 }, () =>
        fetch('/api/backend/v1/auth/me').then((response) => response.status),
      ),
    ),
  );
  expect(respostas).toEqual([200, 200, 200, 200, 200]);

  // Refresh inválido encerra a sessão e preserva a página de destino.
  await trocarCookie(context, page, ACCESS_COOKIE, 'token-vencido');
  await trocarCookie(context, page, REFRESH_COOKIE, 'refresh-invalido');
  await page.goto('/?origem=teste');
  await expect(page).toHaveURL('/login?redirect=%2F%3Forigem%3Dteste');
  const nomes = (await context.cookies()).map((cookie) => cookie.name);
  expect(nomes).not.toContain(REFRESH_COOKIE);
});

test('o proxy não entrega tokens ao navegador', async ({ page }) => {
  await page.goto('/login');

  const status = await page.evaluate(
    ([email, senha]) =>
      fetch('/api/backend/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      }).then((response) => response.status),
    [EMAIL, SENHA],
  );

  expect(status).toBe(404);
});

test('o login não tem violações de acessibilidade', async ({ page }) => {
  await page.goto('/login');

  const { violations } = await new AxeBuilder({ page }).analyze();

  expect(violations).toEqual([]);
});
