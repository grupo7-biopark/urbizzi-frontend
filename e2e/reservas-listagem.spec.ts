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
  const outroLoteamento = await api<components['schemas']['LoteamentoDto']>(
    request,
    'POST',
    '/loteamentos',
    { nome: `Sem reservas ${cenario.lote.id}` },
  );
  const segundo = await api<components['schemas']['LoteDto']>(
    request,
    'POST',
    '/lotes',
    { quadraId: cenario.lote.quadraId, numero: '13', areaM2: '200.00' },
  );
  const terceiro = await api<components['schemas']['LoteDto']>(
    request,
    'POST',
    '/lotes',
    { quadraId: cenario.lote.quadraId, numero: '14', areaM2: '200.00' },
  );
  const comercial = await como(browser, 'comercial', testInfo);
  const outro = await como(browser, 'outro', testInfo);
  try {
    await api(comercial.context.request, 'POST', '/reservas', {
      loteId: terceiro.id,
      clienteId: cenario.cliente.id,
    });
    await api(outro.context.request, 'POST', '/reservas', {
      loteId: segundo.id,
      clienteId: cenario.cliente.id,
    });
    await api(comercial.context.request, 'POST', '/reservas', {
      loteId: cenario.lote.id,
      clienteId: cenario.cliente.id,
    });
    await comercial.page.goto(
      `/reservas?loteamentoId=${cenario.lote.loteamentoId}&vendedorId=${scenario.accounts.outro.id}`,
    );
    await expect(
      comercial.page.getByRole('heading', {
        name: 'Minhas reservas',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      comercial.page.getByRole('link', { name: /^Lote 1[234]/ }),
    ).toHaveText([/^Lote 14/, /^Lote 12/]);
    await expect(
      comercial.page.getByRole('button', { name: 'Renovar', exact: true }),
    ).toHaveCount(2);
    await expect(
      comercial.page.getByRole('button', {
        name: 'Criar proposta',
        exact: true,
      }),
    ).toHaveCount(2);
    await page.goto(`/reservas?loteamentoId=${cenario.lote.loteamentoId}`);
    const lotes = page.getByRole('link', { name: /^Lote 1[234]/ });
    await expect(lotes).toHaveText([/^Lote 14/, /^Lote 13/, /^Lote 12/]);
    await page.getByLabel('Status', { exact: true }).selectOption('CANCELADA');
    await expect(lotes).toHaveCount(0);
    await page.getByLabel('Status', { exact: true }).selectOption('');
    await expect(page.getByRole('link', { name: /^Lote 13/ })).toBeVisible();
    await page.getByLabel('Vencimento de').fill('2000-01-01');
    await page.getByLabel('Vencimento até').fill('2000-01-02');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(lotes).toHaveCount(0);
    await page.getByLabel('Vencimento de').fill('');
    await page.getByLabel('Vencimento até').fill('');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page.getByRole('link', { name: /^Lote 13/ })).toBeVisible();
    await page
      .getByLabel('Identificador do vendedor')
      .fill(scenario.accounts.outro.id);
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(lotes).toHaveText([/^Lote 13/]);
    await page
      .getByLabel('Loteamento', { exact: true })
      .selectOption(outroLoteamento.id);
    await expect(lotes).toHaveCount(0);
    await page
      .getByLabel('Loteamento', { exact: true })
      .selectOption(cenario.lote.loteamentoId);
    await expect(lotes).toHaveText([/^Lote 13/]);
  } finally {
    await comercial.context.close();
    await outro.context.close();
  }
});
