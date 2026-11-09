import type { components } from '../src/shared/api/schema';
import { api, como, expect, test } from './support/reservas.fixture';
test.skip(
  !process.env.E2E_API_URL || !process.env.E2E_BACKEND_DIR,
  'Requer backend real e banco isolado de teste.',
);
test('Minhas reservas isola vendedores; gestor filtra o conjunto', async ({
  browser,
  request,
  page,
  cenario,
  scenario,
}, testInfo) => {
  const segundo = await api<components['schemas']['LoteDto']>(
    request,
    'POST',
    '/lotes',
    { quadraId: cenario.lote.quadraId, numero: '13', areaM2: '200.00' },
  );
  const comercial = await como(browser, 'comercial', testInfo);
  const outro = await como(browser, 'outro', testInfo);
  try {
    await api(outro.context.request, 'POST', '/reservas', {
      loteId: segundo.id,
      clienteId: cenario.cliente.id,
    });
    await api(comercial.context.request, 'POST', '/reservas', {
      loteId: cenario.lote.id,
      clienteId: cenario.cliente.id,
    });
    await comercial.page.goto(
      `/reservas?loteamentoId=${cenario.lote.loteamentoId}`,
    );
    await expect(
      comercial.page.getByRole('heading', {
        name: 'Minhas reservas',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      comercial.page.getByRole('link', { name: /^Lote 12/ }),
    ).toBeVisible();
    await expect(
      comercial.page.getByRole('link', { name: /^Lote 13/ }),
    ).toHaveCount(0);
    await page.goto(`/reservas?loteamentoId=${cenario.lote.loteamentoId}`);
    await expect(page.getByRole('link', { name: /^Lote 12/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Lote 13/ })).toBeVisible();
    const ordem = await page
      .getByRole('link', { name: /^Lote 1[23]/ })
      .allTextContents();
    expect(ordem.map((texto) => texto.match(/Lote\s+(12|13)/)?.[1])).toEqual([
      '13',
      '12',
    ]);
    await page.getByLabel('Status', { exact: true }).selectOption('CANCELADA');
    await expect(page.getByRole('link', { name: /^Lote 1[23]/ })).toHaveCount(
      0,
    );
    await page.getByLabel('Status', { exact: true }).selectOption('');
    await expect(page.getByRole('link', { name: /^Lote 13/ })).toBeVisible();
    await page.getByLabel('Vencimento de').fill('2000-01-01');
    await page.getByLabel('Vencimento até').fill('2000-01-02');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page.getByRole('link', { name: /^Lote 1[23]/ })).toHaveCount(
      0,
    );
    await page.getByLabel('Vencimento de').fill('');
    await page.getByLabel('Vencimento até').fill('');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page.getByRole('link', { name: /^Lote 13/ })).toBeVisible();
    await page
      .getByLabel('Identificador do vendedor')
      .fill(scenario.accounts.outro.id);
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page.getByRole('link', { name: /^Lote 13/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Lote 12/ })).toHaveCount(0);
  } finally {
    await comercial.context.close();
    await outro.context.close();
  }
});
