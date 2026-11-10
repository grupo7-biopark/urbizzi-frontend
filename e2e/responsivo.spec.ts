import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { garantirPlantaAtiva } from './support/planta';

// iPad mini em retrato: o menor tablet comum e o limite inferior do layout de
// tablet. Abaixo de 768 px o sistema já é coberto como celular.
const TABLET = { width: 768, height: 1024 };

const fake = !process.env.E2E_API_URL;
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';

const TELAS: readonly [rota: string, titulo: string | RegExp][] = [
  ['/', 'Início'],
  ['/mapa', 'Mapa'],
  ['/loteamentos', 'Loteamentos'],
  ['/loteamentos/novo', 'Novo loteamento'],
  ['/lotes', 'Lotes'],
  ['/lotes/novo', 'Novo lote'],
  ['/lotes/importar', 'Importar lotes'],
  ['/plantas', 'Plantas'],
  ['/plantas/nova', 'Enviar planta'],
  ['/mapa/editor', 'Editar marcadores'],
  ['/clientes', 'Clientes'],
  ['/clientes/novo', 'Novo cliente'],
  ['/reservas', /^(Reservas|Minhas reservas)$/],
  ['/propostas', 'Minhas propostas'],
  ['/links-publicos', 'Links públicos'],
  ['/historico', 'Histórico'],
  ['/usuarios', 'Usuários'],
  ['/usuarios/novo', 'Novo usuário'],
  ['/configuracoes', 'Configurações'],
];

async function entrar(page: Page, email = EMAIL) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

/** Espera a tela estabilizar e confere rolagem horizontal e acessibilidade. */
async function conferirTela(page: Page, rota: string, titulo: string | RegExp) {
  await page.goto(rota);
  await expect(
    page.getByRole('heading', { level: 1, name: titulo }),
  ).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      { message: `Rolagem horizontal em ${rota}` },
    )
    .toBeLessThanOrEqual(0);

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations, `Violações de acessibilidade em ${rota}`).toEqual([]);
}

test.skip(!fake, 'Depende dos dados da API falsa.');

test('as telas principais cabem e não têm violações no tablet', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.setViewportSize(TABLET);
  await entrar(page);
  await garantirPlantaAtiva(page);

  for (const [rota, titulo] of TELAS) {
    await conferirTela(page, rota, titulo);
  }

  // Abaixo de `lg` o menu vira a gaveta, que precisa caber e ser acessível.
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  const gaveta = page.getByRole('dialog', { name: 'Menu' });
  await expect(gaveta).toBeVisible();
  await expect(gaveta.getByRole('link', { name: 'Mapa' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(gaveta).toBeHidden();
});

test('o login e o mapa público cabem e não têm violações no tablet', async ({
  browser,
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize(TABLET);
  await page.goto('/login');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Entrar' }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);

  await entrar(page);
  const criado = await page.request.post('/api/backend/v1/links-publicos', {
    headers: { origin: new URL(page.url()).origin },
    data: {},
  });
  expect(criado.status(), await criado.text()).toBe(201);
  const { token } = (await criado.json()) as { token: string };

  // Sem sessão, como quem recebe o link.
  const anonimo = await browser.newContext({ viewport: TABLET });
  const publica = await anonimo.newPage();
  try {
    await publica.goto(`/p/${token}`);
    await expect(
      publica.getByRole('heading', { level: 1, name: 'Mapa público' }),
    ).toBeVisible();
    await expect
      .poll(() =>
        publica.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    expect(
      (await new AxeBuilder({ page: publica }).analyze()).violations,
    ).toEqual([]);
  } finally {
    await anonimo.close();
  }
});
