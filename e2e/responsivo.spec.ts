import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { garantirPlantaAtiva } from './support/planta';
import { entrar, excessoHorizontal } from './support/sessao';

// iPad mini em retrato: o menor tablet comum e o limite inferior do layout de
// tablet. Abaixo de 768 px o sistema já é coberto como celular.
const TABLET = { width: 768, height: 1024 };
// Paisagem: o layout cruza o breakpoint `lg` e troca a gaveta pela barra lateral.
const TABLET_PAISAGEM = { width: 1024, height: 768 };

const fake = !process.env.E2E_API_URL;

type Tela = readonly [
  rota: string,
  titulo: string | RegExp,
  pronto?: (page: Page) => Promise<void>,
];

const MAPA_PRONTO = async (page: Page) => {
  await expect(
    page.getByRole('application', { name: /^Planta / }),
  ).toBeVisible();
};

const TABELA = (nome: string) => async (page: Page) => {
  await expect(page.getByRole('table', { name: nome })).toBeVisible();
};

const TELAS: readonly Tela[] = [
  ['/', 'Início'],
  ['/mapa', 'Mapa', MAPA_PRONTO],
  ['/loteamentos', 'Loteamentos'],
  ['/loteamentos/novo', 'Novo loteamento'],
  ['/lotes', 'Lotes'],
  ['/lotes/novo', 'Novo lote'],
  ['/lotes/importar', 'Importar lotes'],
  ['/plantas', 'Plantas'],
  ['/plantas/nova', 'Enviar planta'],
  ['/mapa/editor', 'Editar marcadores', MAPA_PRONTO],
  ['/clientes', 'Clientes'],
  ['/clientes/novo', 'Novo cliente'],
  ['/reservas', /^(Reservas|Minhas reservas)$/, TABELA('Reservas')],
  ['/propostas', 'Minhas propostas', TABELA('Minhas propostas')],
  ['/links-publicos', 'Links públicos'],
  ['/historico', 'Histórico'],
  ['/usuarios', 'Usuários'],
  ['/usuarios/novo', 'Novo usuário'],
  ['/configuracoes', 'Configurações'],
];

const TELAS_ESCURO: readonly Tela[] = [
  ['/', 'Início'],
  ['/lotes', 'Lotes'],
  ['/mapa', 'Mapa', MAPA_PRONTO],
  ['/propostas', 'Minhas propostas', TABELA('Minhas propostas')],
];

const TELAS_PAISAGEM: readonly Tela[] = [
  ['/', 'Início'],
  ['/lotes', 'Lotes'],
  ['/mapa', 'Mapa', MAPA_PRONTO],
];

test.use({ viewport: TABLET, reducedMotion: 'reduce' });

/** Espera a tela carregar de verdade e confere rolagem horizontal e acessibilidade. */
async function conferirTela(page: Page, [rota, titulo, pronto]: Tela) {
  await page.goto(rota);
  await expect(
    page.getByRole('heading', { level: 1, name: titulo }),
  ).toBeVisible();

  // O esqueleto de cada tabela e do visualizador é um `output` de status. Sem
  // ele, o axe não corre o risco de auditar apenas o carregamento.
  await expect(page.getByRole('status', { name: /^Carregando/ })).toHaveCount(
    0,
  );
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await pronto?.(page);

  await expect
    .poll(() => excessoHorizontal(page), {
      message: `Rolagem horizontal em ${rota}`,
    })
    .toBeLessThanOrEqual(0);

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations, `Violações de acessibilidade em ${rota}`).toEqual([]);
}

async function criarLinkPublico(page: Page) {
  const criado = await page.request.post('/api/backend/v1/links-publicos', {
    headers: { origin: new URL(page.url()).origin },
    data: {},
  });
  expect(criado.status(), await criado.text()).toBe(201);
  return (await criado.json()) as { id: string; token: string };
}

async function desativarLinkPublico(page: Page, id: string) {
  const resposta = await page.request.post(
    `/api/backend/v1/links-publicos/${id}/desativar`,
    { headers: { origin: new URL(page.url()).origin } },
  );
  expect(resposta.ok(), await resposta.text()).toBe(true);
}

test.skip(!fake, 'Depende dos dados da API falsa.');

test('as telas principais cabem e não têm violações no tablet', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await entrar(page);
  await garantirPlantaAtiva(page);

  // O link precisa existir antes de a listagem ser auditada, sem depender da
  // ordem de outro teste que roda em paralelo.
  const link = await criarLinkPublico(page);

  try {
    for (const tela of TELAS) {
      await conferirTela(page, tela);
    }

    // Abaixo de `lg` o menu vira a gaveta, que precisa caber e ser acessível.
    await page.goto('/');
    const gatilho = page.getByRole('button', { name: 'Menu' });
    await gatilho.click();
    const gaveta = page.getByRole('dialog', { name: 'Menu' });
    await expect(gaveta).toBeVisible();
    await expect(gaveta.getByRole('link', { name: 'Mapa' })).toBeVisible();
    await expect
      .poll(
        () =>
          gaveta.evaluate(
            (elemento) => elemento.scrollWidth - elemento.clientWidth,
          ),
        { message: 'Rolagem horizontal na gaveta' },
      )
      .toBeLessThanOrEqual(0);

    const caixa = await gaveta.boundingBox();
    expect(caixa).not.toBeNull();
    expect(caixa!.x).toBeGreaterThanOrEqual(0);
    expect(caixa!.y).toBeGreaterThanOrEqual(0);
    expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(TABLET.width);
    expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(TABLET.height);

    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    // O Radix prende o foco no diálogo e o devolve ao gatilho ao fechar.
    await expect(gaveta.getByRole('button', { name: 'Fechar' })).toBeFocused();
    for (let passo = 0; passo < 3; passo += 1) {
      await page.keyboard.press('Tab');
      expect(
        await gaveta.evaluate((elemento) =>
          elemento.contains(document.activeElement),
        ),
      ).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(gaveta).toBeHidden();
    await expect(gatilho).toBeFocused();

    // O diálogo de criação tem foco próprio e também precisa passar no axe.
    await page.goto('/links-publicos');
    await page.getByRole('button', { name: 'Gerar link', exact: true }).click();
    const dialogo = page.getByRole('dialog', { name: 'Gerar link público' });
    await expect(dialogo).toBeVisible();
    await expect(page.getByRole('status', { name: /^Carregando/ })).toHaveCount(
      0,
    );
    expect(
      (await new AxeBuilder({ page }).analyze()).violations,
      'Violações de acessibilidade no diálogo de link público',
    ).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
  } finally {
    await desativarLinkPublico(page, link.id);
  }
});

test.describe('tema escuro', () => {
  test.use({ colorScheme: 'dark' });

  test('as telas principais cabem e não têm violações no tablet', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await entrar(page);
    await garantirPlantaAtiva(page);

    for (const tela of TELAS_ESCURO) {
      await conferirTela(page, tela);
    }
  });
});

test.describe('tablet em paisagem', () => {
  test.use({ viewport: TABLET_PAISAGEM });

  test('a barra lateral aparece e as telas cabem', async ({ page }) => {
    test.setTimeout(180_000);
    await entrar(page);
    await garantirPlantaAtiva(page);

    await expect(page.getByRole('complementary')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();

    for (const tela of TELAS_PAISAGEM) {
      await conferirTela(page, tela);
    }
  });
});

test('o login e o mapa público cabem e não têm violações no tablet', async ({
  browser,
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto('/login');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Entrar' }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await excessoHorizontal(page)).toBeLessThanOrEqual(0);

  await entrar(page);
  const link = await criarLinkPublico(page);

  // Sem sessão, como quem recebe o link.
  const anonimo = await browser.newContext({
    viewport: TABLET,
    reducedMotion: 'reduce',
  });
  const publica = await anonimo.newPage();
  try {
    await publica.goto(`/p/${link.token}`);
    await expect(
      publica.getByRole('heading', { level: 1, name: 'Mapa público' }),
    ).toBeVisible();
    await expect(
      publica.getByRole('status', { name: /^Carregando/ }),
    ).toHaveCount(0);
    await expect(
      publica.getByRole('application', { name: /^Planta / }),
    ).toBeVisible();
    await expect
      .poll(() => excessoHorizontal(publica), {
        message: 'Rolagem horizontal no mapa público',
      })
      .toBeLessThanOrEqual(0);
    expect(
      (await new AxeBuilder({ page: publica }).analyze()).violations,
    ).toEqual([]);
  } finally {
    await anonimo.close();
    await desativarLinkPublico(page, link.id);
  }
});
