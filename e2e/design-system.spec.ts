import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const TEMAS = [
  { nome: 'Claro', superficie: 'rgb(255, 255, 255)' },
  { nome: 'Escuro', superficie: 'rgb(0, 0, 0)' },
];

for (const { nome, superficie } of TEMAS) {
  test(`tema ${nome}: sem violações de acessibilidade, inclusive contraste`, async ({
    page,
  }) => {
    await page.goto('/design-system');
    await page.getByRole('button', { name: nome, exact: true }).click();

    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      superficie,
    );

    const { violations } = await new AxeBuilder({ page }).analyze();

    expect(
      violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.html}`),
    ).toEqual([]);
  });

  test(`tema ${nome}: Dialog aberto sem violações`, async ({ page }) => {
    await page.goto('/design-system');
    await page.getByRole('button', { name: nome, exact: true }).click();
    await page.getByRole('button', { name: 'Abrir Dialog' }).click();

    const { violations } = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();

    expect(
      violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.html}`),
    ).toEqual([]);
  });
}

test('segue o tema do sistema quando nada foi escolhido', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/design-system');

  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(0, 0, 0)',
  );
  await expect(page.locator('header img[src*="wordmark-white"]')).toBeVisible();
  await expect(page.locator('header img[src*="wordmark-orange"]')).toBeHidden();
});

test('tudo é retangular, sem sombra, e as fontes vêm do próprio servidor', async ({
  page,
}) => {
  const externas: string[] = [];
  page.on('request', (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) {
      externas.push(request.url());
    }
  });

  await page.goto('/design-system');
  await page.evaluate(() => document.fonts.ready);

  const fora = await page.evaluate(
    () =>
      [...document.querySelectorAll('main *')]
        .map((elemento) => getComputedStyle(elemento))
        .filter(
          (estilo) =>
            estilo.borderTopLeftRadius !== '0px' || estilo.boxShadow !== 'none',
        ).length,
  );

  expect(fora).toBe(0);
  expect(externas).toEqual([]);

  // `document.fonts.check` devolve true para fonte inexistente, então a lista é conferida.
  const carregadas = await page.evaluate(() =>
    [...document.fonts]
      .filter((fonte) => fonte.status === 'loaded')
      .map((fonte) => `${fonte.family} ${fonte.weight}`)
      .join(),
  );

  expect(carregadas).toMatch(/Inter.* 400/);
  expect(carregadas).toMatch(/Inter.* 900/);
  expect(carregadas).toMatch(/Bebas.*Neue/);
});

test('Dialog funciona só com o teclado', async ({ page }) => {
  await page.goto('/design-system');
  const abrir = page.getByRole('button', { name: 'Abrir Dialog' });

  await abrir.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(abrir).toBeFocused();
});

test('foco visível nos controles', async ({ page }) => {
  await page.goto('/design-system');
  await page.getByRole('button', { name: 'Primário' }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');

  await expect(page.getByRole('button', { name: 'Primário' })).toHaveCSS(
    'outline-style',
    'solid',
  );
});

test('no celular a página não tem rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/design-system');

  const excesso = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

  expect(excesso).toBe(0);
});
