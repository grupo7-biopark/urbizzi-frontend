import { expect, test, type Page } from '@playwright/test';
const fake = !process.env.E2E_API_URL;
async function entrar(page: Page, email = 'pessoa@exemplo.com') {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-de-teste-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}
async function api(page: Page, path: string, body?: unknown) {
  return page.evaluate(
    async ({ path: caminho, body: dados }) => {
      const r = await fetch(`/api/backend${caminho}`, {
        method: dados ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        ...(dados ? { body: JSON.stringify(dados) } : {}),
      });
      if (!r.ok) throw new Error(`Falha na preparação: ${r.status}`);
      return r.json();
    },
    { path, body },
  );
}
test('histórico filtra por entidade e usuário e mantém escopo Comercial', async ({
  page,
}) => {
  test.skip(!fake, 'Dados da API falsa');
  await entrar(page);
  const l = await api(page, '/v1/loteamentos', {
    nome: `Histórico ${Date.now()}`,
  });
  const q = await api(page, `/v1/loteamentos/${l.id}/quadras`, {
    numero: 'H25',
  });
  const lote = await api(page, '/v1/lotes', {
    quadraId: q.id,
    numero: '25',
    areaM2: '360.00',
  });
  const usuario = await api(page, '/v1/auth/me');
  await page.goto('/historico');
  await page.getByLabel('Tipo de entidade').selectOption('Lote');
  await page.getByLabel('ID da entidade').fill(lote.id);
  await page.getByLabel('ID do usuário').fill(usuario.id);
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page).toHaveURL(new RegExp(`entidadeId=${lote.id}`));
  await expect(page).toHaveURL(new RegExp(`usuarioId=${usuario.id}`));
  await expect(page.getByRole('table', { name: 'Histórico' })).toContainText(
    lote.id,
  );
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ver alteração' })).toHaveCount(
    1,
  );
  await page.getByRole('button', { name: 'Ver alteração' }).click();
  await expect(page.getByRole('dialog')).toContainText('Novo');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login/);
  await entrar(page, 'comercial@exemplo.com');
  await page.goto(`/historico?entidadeId=${lote.id}&usuarioId=${usuario.id}`);
  await expect(
    page.getByText('Nenhum resultado para os filtros'),
  ).toBeVisible();
});
