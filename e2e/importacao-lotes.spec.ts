import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// O fluxo de importação também roda contra o backend real, com E2E_API_URL, E2E_EMAIL
// e E2E_SENHA. Os demais usam os usuários da API falsa (e2e/support/fake-api.mjs).
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const SEM_API_FALSA = !!process.env.E2E_API_URL;
const CABECALHO = 'loteamento;quadra;numero;area_m2';

async function entrar(page: Page, email = EMAIL) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

function nomeUnico() {
  return `Loteamento Importado ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function makePlanilha(linhas: string[], name = 'lotes.csv') {
  return {
    name,
    mimeType: 'text/csv',
    buffer: Buffer.from([CABECALHO, ...linhas].join('\r\n')),
  };
}

async function abrir(page: Page) {
  await page.goto('/lotes/importar');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Importar lotes' }),
  ).toBeVisible();
}

/**
 * Repete a seleção e o envio: no `next dev`, o campo aparece antes da hidratação, e
 * o evento se perde. A validação não grava nada, então repetir não tem efeito.
 */
async function validar(
  page: Page,
  planilha: ReturnType<typeof makePlanilha>,
  depois: () => Promise<void>,
) {
  await expect(async () => {
    await page.locator('input[type="file"]').setInputFiles(planilha);
    await page.getByRole('button', { name: 'Validar planilha' }).click();
    await depois();
  }).toPass();
}

test('importa uma planilha válida, e planilhas com erro não gravam nada', async ({
  page,
}) => {
  test.slow();
  await entrar(page);
  const nome = nomeUnico();

  // Chega pela listagem
  await page.goto('/lotes');
  await page.getByRole('link', { name: 'Importar planilha' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Importar lotes' }),
  ).toBeVisible();

  // Modelo
  const [modelo] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Baixar modelo CSV' }).click(),
  ]);
  const conteudoModelo = await readFile(await modelo.path(), 'utf8');
  expect(conteudoModelo.toLowerCase()).toContain('loteamento');

  // Formato inválido: o erro aparece no campo
  await validar(page, makePlanilha([], 'lotes.txt'), async () => {
    await expect(page.locator('input[type="file"]')).toHaveAttribute(
      'aria-invalid',
      'true',
      { timeout: 2000 },
    );
  });
  await expect(
    page.getByRole('button', { name: 'Confirmar importação' }),
  ).toBeHidden();

  // Com erros: cada linha aparece, não dá para confirmar e há relatório
  await page.getByLabel('Criar os loteamentos e as quadras').check();
  await validar(
    page,
    makePlanilha([`${nome};Q1;1;360,00`, `${nome};Q1;2;`]),
    async () => {
      await expect(
        page.getByRole('table', { name: 'Erros por linha' }),
      ).toBeVisible({ timeout: 2000 });
    },
  );
  const erros = page.getByRole('table', { name: 'Erros por linha' });
  await expect(
    erros.getByRole('cell', { name: '3', exact: true }),
  ).toBeVisible();
  await expect(erros).toContainText(/area/i);
  await expect(
    page.getByRole('button', { name: 'Confirmar importação' }),
  ).toBeDisabled();
  const [relatorio] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar relatório de erros' }).click(),
  ]);
  const conteudoRelatorio = await readFile(await relatorio.path(), 'utf8');
  expect(conteudoRelatorio).toContain('linha;erro');
  expect(conteudoRelatorio).toMatch(/3;".*area/i);

  // Nada foi gravado
  const antes = await page.evaluate(async (busca) => {
    const response = await fetch(
      `/api/backend/v1/loteamentos?q=${encodeURIComponent(busca)}`,
    );
    return (await response.json()) as { meta: { total: number } };
  }, nome);
  expect(antes.meta.total).toBe(0);

  // Válida: a prévia mostra o resumo, e confirmar grava
  await page.getByRole('button', { name: 'Enviar outra planilha' }).click();
  await page.getByLabel('Criar os loteamentos e as quadras').check();
  await page
    .locator('input[type="file"]')
    .setInputFiles(
      makePlanilha([`${nome};Q1;1;360,00`, `${nome};Q1;2;400,00`]),
    );
  await page.getByRole('button', { name: 'Validar planilha' }).click();

  await expect(page.getByText('Lotes válidos')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar importação' }).click();
  await expect(page.getByText('2 lotes importados.')).toBeVisible();

  // Os lotes aparecem na listagem
  await page.getByRole('link', { name: 'Ver os lotes' }).click();
  await expect(page).toHaveURL('/lotes');
  await page
    .getByRole('combobox', { name: 'Loteamento' })
    .selectOption({ label: nome });
  await expect(page.getByText('2 resultados')).toBeVisible();
  await expect(
    page.getByRole('row').filter({ hasText: nome }).first(),
  ).toBeVisible();
});

test.describe('com os usuários da API falsa', () => {
  test.skip(SEM_API_FALSA, 'Depende dos usuários da API falsa.');

  for (const email of ['comercial@exemplo.com', 'consulta@exemplo.com']) {
    test(`${email} não acessa a importação`, async ({ page }) => {
      await entrar(page, email);

      const resposta = await page.goto('/lotes/importar');
      expect(resposta?.status()).toBe(403);

      await page.goto('/lotes');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Lotes' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Importar planilha' }),
      ).toBeHidden();
    });
  }

  test('no celular, a prévia não cria rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await entrar(page, 'gestor@exemplo.com');
    await abrir(page);

    await validar(
      page,
      makePlanilha(['Inexistente com um nome bem comprido;Q1;1;']),
      async () => {
        await expect(
          page.getByRole('table', { name: 'Erros por linha' }),
        ).toBeVisible({ timeout: 2000 });
      },
    );

    const excesso = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(excesso).toBeLessThanOrEqual(0);
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`no tema ${colorScheme}`, () => {
      test.use({ colorScheme });

      test('as etapas não têm violações de acessibilidade', async ({
        page,
      }) => {
        await entrar(page, 'gestor@exemplo.com');
        await abrir(page);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );

        await validar(page, makePlanilha(['Inexistente;Q1;1;']), async () => {
          await expect(
            page.getByRole('table', { name: 'Erros por linha' }),
          ).toBeVisible({ timeout: 2000 });
        });
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      });
    });
  }
});
