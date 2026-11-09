import { AxeBuilder } from '@axe-core/playwright';
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
test('gera, copia e desativa link público, sem exigir sessão no destino', async ({
  page,
  context,
}) => {
  test.skip(!fake, 'Dados da API falsa');
  test.slow();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await entrar(page, 'comercial@exemplo.com');
  await page.goto('/links-publicos');
  await page.getByRole('button', { name: 'Gerar link', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Gerar link público' });
  await form.getByRole('button', { name: 'Gerar link', exact: true }).click();
  const resultado = page.getByRole('dialog', { name: 'Link público criado' });
  await resultado.getByRole('button', { name: 'Copiar link' }).click();
  await expect(resultado.getByText('Link copiado.')).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/p\/[A-Za-z0-9_-]{43}$/);
  await resultado.getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(resultado).toBeHidden();
  const anonimo = await context.browser()!.newContext();
  const publico = await anonimo.newPage();
  const response = await publico.goto(url);
  expect(response?.headers()['referrer-policy']).toBe('no-referrer');
  await expect(
    publico.getByRole('heading', { name: 'Mapa público', exact: true }),
  ).toBeVisible();
  const linha = page
    .getByRole('row')
    .filter({ has: page.locator(`a[href="${url}"]`) });
  await linha.getByRole('button', { name: 'Desativar', exact: true }).click();
  await page
    .getByRole('button', { name: 'Desativar link', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await publico.reload();
  await expect(
    publico.getByRole('heading', { name: 'Mapa indisponível' }),
  ).toBeVisible();
  await anonimo.close();
});
test('novas telas respeitam os temas, celular e acessibilidade', async ({
  page,
}, testInfo) => {
  test.skip(!fake, 'Dados da API falsa');
  test.slow();
  await entrar(page);
  const l = await api(page, '/v1/loteamentos', {
    nome: `Jardim Horizonte ${Date.now()}`,
  });
  const q = await api(page, `/v1/loteamentos/${l.id}/quadras`, { numero: 'A' });
  const lote = await api(page, '/v1/lotes', {
    quadraId: q.id,
    numero: '17',
    areaM2: '360.00',
    valor: '250000.00',
    observacoes: 'Lote de esquina com vista para a área verde.',
  });
  await api(page, '/v1/links-publicos', { loteamentoId: l.id });
  for (const [nome, rota, pronto] of [
    ['fe17', `/lotes/${lote.id}`, 'Dados do lote'],
    ['fe25', `/historico?entidadeId=${lote.id}`, 'Histórico'],
    ['fe32', '/links-publicos', 'Links públicos'],
  ]) {
    for (const mobile of [false, true]) {
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      );
      await page.emulateMedia({
        colorScheme: mobile ? 'dark' : 'light',
        reducedMotion: 'reduce',
      });
      await page.goto(rota!);
      await expect(
        page.getByRole('heading', { name: pronto!, exact: true }).first(),
      ).toBeVisible();
      await expect(page.getByLabel(`Carregando: ${pronto}`)).toBeHidden();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(
          `${nome}-${mobile ? 'celular-escuro' : 'desktop-claro'}.png`,
        ),
        fullPage: true,
      });
    }
  }
});
