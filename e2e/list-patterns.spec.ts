import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

function filtroStatus(page: Page) {
  return page.getByRole('search', { name: 'Filtros' }).getByLabel('Status');
}

async function abrir(page: Page, query = '') {
  await page.goto(`/design-system${query}`);
  await expect(
    page.getByRole('table', { name: 'Lotes de exemplo' }),
  ).toBeVisible();
}

test('recarregar mantém a página, os filtros e a busca', async ({ page }) => {
  await abrir(page);
  const tabela = page.getByRole('table', { name: 'Lotes de exemplo' });

  await filtroStatus(page).selectOption('DISPONIVEL');
  await expect(page).toHaveURL(/status=DISPONIVEL/);

  await page.getByLabel('Buscar lote').fill('lote 1');
  await expect(page).toHaveURL(/q=lote(%20|\+)1/);
  await expect(tabela.getByText('Lote 1', { exact: true })).toBeVisible();
  await expect(tabela.getByText('Lote 13', { exact: true })).toBeVisible();
  await expect(tabela.getByText('Lote 2', { exact: true })).toBeHidden();

  await page.reload();

  await expect(filtroStatus(page)).toHaveValue('DISPONIVEL');
  await expect(page.getByLabel('Buscar lote')).toHaveValue('lote 1');
  await expect(tabela.getByText('Lote 13', { exact: true })).toBeVisible();
});

test('pagina pela URL, mantendo os filtros, e volta à primeira ao filtrar', async ({
  page,
}) => {
  await abrir(page, '?status=VENDIDO');
  const paginacao = page.getByRole('navigation', {
    name: 'Paginação',
    exact: true,
  });
  const tabela = page.getByRole('table', { name: 'Lotes de exemplo' });

  // VENDIDO só tem 5 ou 6 lotes: com 23 no total, há uma segunda página.
  await paginacao.getByRole('link', { name: 'Página 2' }).click();
  await expect(page).toHaveURL(/status=VENDIDO&page=2/);
  await expect(tabela.getByText('Lote 23', { exact: true })).toBeVisible();

  await page.reload();
  await expect(tabela.getByText('Lote 23', { exact: true })).toBeVisible();

  await filtroStatus(page).selectOption('BLOQUEADO');
  await expect(page).toHaveURL(/\?status=BLOQUEADO$/);
});

test('sem resultado, oferece limpar os filtros', async ({ page }) => {
  await page.goto('/design-system?q=inexistente');

  await expect(
    page.getByText('Nenhum resultado para os filtros'),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Limpar filtros' }).first().click();

  await expect(page).toHaveURL('/design-system');
  await expect(page.getByLabel('Buscar lote')).toHaveValue('');
  await expect(
    page.getByRole('table', { name: 'Lotes de exemplo' }),
  ).toBeVisible();
});

test('a URL com valor inválido não derruba a tela', async ({ page }) => {
  await abrir(page, '?page=abc');

  await expect(
    page
      .getByRole('table', { name: 'Lotes de exemplo' })
      .getByText('Lote 1', { exact: true }),
  ).toBeVisible();
});

test('no celular, a tabela vira cartões sem rolagem horizontal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await abrir(page);

  const tabela = page.getByRole('table', { name: 'Lotes de exemplo' });
  const celula = tabela.getByRole('cell').first();

  await expect(tabela.getByRole('columnheader').first()).toBeHidden();
  // O rótulo da coluna acompanha o valor em cada cartão.
  await expect(celula.getByText('Número')).toBeVisible();
  await expect(celula.getByText('Lote 1', { exact: true })).toBeVisible();
  await expect(tabela).toHaveCSS('display', 'block');

  const excesso = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(excesso).toBe(0);
});

test('no computador, continua sendo uma tabela', async ({ page }) => {
  await abrir(page);

  const tabela = page.getByRole('table', { name: 'Lotes de exemplo' });

  await expect(tabela).toHaveCSS('display', 'table');
  await expect(tabela.getByRole('columnheader').first()).toBeVisible();
  await expect(
    tabela.getByRole('cell').first().getByText('Número'),
  ).toBeHidden();
});

test('mostra embaixo do campo o erro de validação da API', async ({ page }) => {
  await abrir(page);

  await page.locator('input[name="nome"]').fill('Erro');
  await page.getByLabel('CPF ou CNPJ').pressSequentially('52998224725');
  await expect(page.getByLabel('CPF ou CNPJ')).toHaveValue('529.982.247-25');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Documento inválido')).toBeVisible();
  await expect(page.getByLabel('CPF ou CNPJ')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('CPF ou CNPJ')).toBeFocused();
});

test('confirmação com motivo obrigatório, inclusive no tema escuro', async ({
  page,
}) => {
  await abrir(page);
  await page.getByRole('button', { name: 'Escuro', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir confirmação' }).click();

  const confirmar = page.getByRole('button', { name: 'Cancelar reserva' });
  await expect(confirmar).toBeDisabled();

  const { violations } = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.html}`)).toEqual(
    [],
  );

  await page.getByLabel('Motivo').fill('Cliente desistiu');
  await confirmar.click();

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('Reserva cancelada.')).toBeVisible();
});
