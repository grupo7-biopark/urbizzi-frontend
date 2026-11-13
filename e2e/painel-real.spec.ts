import { expect, test } from './support/reservas.fixture';

test.skip(!process.env.E2E_API_URL, 'Requer backend real e banco de teste.');

test('filtra o loteamento no painel e mostra o total da API no celular', async ({
  page,
  cenario,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page
    .getByLabel('Loteamento', { exact: true })
    .selectOption(cenario.lote.loteamentoId);
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page).toHaveURL(
    new RegExp(`loteamentoId=${cenario.lote.loteamentoId}`),
  );
  const resumo = page.getByRole('region', { name: 'Resumo de lotes' });
  await expect(resumo.getByRole('definition').first()).toHaveText('1');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
