import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// O fluxo de cadastro também roda contra o backend real, com E2E_API_URL, E2E_EMAIL
// e E2E_SENHA. Os demais usam os dados da API falsa (e2e/support/fake-api.mjs).
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const SEM_API_FALSA = !!process.env.E2E_API_URL;
const SEMENTE = 'Loteamento Semente';
const SEMENTE_ID = '4f0d7a5c-2e96-4ecf-9b7d-6a1d5c9e3f54';

function nomeUnico() {
  return `Loteamento E2E ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function entrar(page: Page, email = EMAIL) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

/** O esqueleto só some depois da hidratação, quando a busca termina. */
async function abrirListagem(page: Page, busca = '') {
  await page.goto(`/loteamentos${busca}`);
  await expect(page.getByLabel('Carregando: Loteamentos')).toBeHidden();
}

/** Exato: sem isso, também casa com "Buscar por nome", da listagem. */
function campoNome(page: Page) {
  return page.getByRole('textbox', { name: 'Nome', exact: true });
}

test('demarcar o lote preenche a área estimada e permite corrigir antes de salvar', async ({
  page,
}) => {
  test.skip(SEM_API_FALSA, 'Usa a quadra fictícia da API simulada.');
  await entrar(page);
  await page.goto('/lotes/novo');
  await page.getByLabel(/^Loteamento/).selectOption(SEMENTE_ID);
  await page.getByLabel(/^Quadra/).selectOption({ label: 'Quadra Semente' });
  const quadraId = await page.getByLabel(/^Quadra/).inputValue();
  await page.route('**/api/backend/v1/geografia/areas?**', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: quadraId,
            quadraId,
            loteamentoId: SEMENTE_ID,
            tipo: 'QUADRA',
            nome: 'Quadra Semente',
            vertices: [
              [0, 0],
              [0, 0.002],
              [0.002, 0.002],
              [0.002, 0],
            ],
          },
        ],
        meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
      },
    }),
  );
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.getByLabel(/^Número/).fill('Área de teste');
  const campo = page.getByLabel(/^Área \(m²\)/);
  await campo.fill('10000');
  await page.getByRole('button', { name: 'Demarcar no mapa' }).click();
  await page.getByText('Informar ou editar coordenadas dos vértices').click();
  await expect(campo).toHaveValue('100,00');
  await page
    .getByLabel('Vértices (latitude, longitude)')
    .fill('0,0\n0,0.001\n0.001,0.001\n0.001,0');
  await page.getByRole('button', { name: 'Aplicar coordenadas' }).click();
  await expect(campo).toHaveValue('12.364,35');
  await expect(
    page.getByRole('status').filter({ hasText: 'Área estimada no mapa' }),
  ).toBeVisible();
  await campo.fill('25000');
  let cadastro: { areaM2: string } | undefined;
  await page.route('**/api/backend/v1/geografia/lotes', async (route) => {
    cadastro = route.request().postDataJSON().cadastro;
    await route.fulfill({
      status: 201,
      json: { id: 'ef66d208-092a-4d28-801d-bdfebd6103ca' },
    });
  });
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page).toHaveURL('/lotes');
  expect(cadastro?.areaM2).toBe('250.00');
});

test('demarcação usa cruz de precisão e restaura o cursor ao concluir', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
        'base64',
      ),
    }),
  );
  await entrar(page);
  await page.goto('/loteamentos/novo');
  await page.getByRole('button', { name: 'Demarcar no mapa' }).click();
  const mapa = page.getByRole('region', { name: 'Mapa geográfico interativo' });
  await expect(mapa).toHaveClass(/leaflet-container/);
  await page
    .getByRole('button', { name: 'Desenhar área', exact: true })
    .click();
  await expect(mapa).toHaveCSS('cursor', 'crosshair');
  await mapa.click({ position: { x: 160, y: 130 } });
  await mapa.click({ position: { x: 260, y: 130 } });
  await mapa.click({ position: { x: 260, y: 230 } });
  await expect(page.getByTitle('Vértice 1')).toHaveCSS('cursor', 'crosshair');
  await page.getByRole('button', { name: 'Concluir desenho' }).click();
  await expect(mapa).not.toHaveCSS('cursor', 'crosshair');
});

test('alterna o tema e mantém a escolha ao recarregar no celular', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await entrar(page);
  const botao = page.getByRole('button', {
    name: 'Alternar tema claro ou escuro',
  });
  await botao.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await botao.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test('Quadras abre diretamente pela lista e pela edição sem salvar', async ({
  page,
}) => {
  test.skip(SEM_API_FALSA, 'Usa o loteamento fictício da API simulada.');
  await entrar(page);
  await abrirListagem(page);
  await page.getByRole('link', { name: `Quadras de ${SEMENTE}` }).click();
  await expect(page).toHaveURL(`/loteamentos/${SEMENTE_ID}#quadras`);
  await expect(
    page.getByRole('heading', { name: 'Quadras', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#quadras').locator('..')).toBeFocused();

  await page.goto(`/loteamentos/${SEMENTE_ID}/editar`);
  await expect(campoNome(page)).toHaveValue(SEMENTE);
  const gravacoes: string[] = [];
  page.on('request', (request) => {
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()) &&
      request.url().includes('/loteamentos/')
    ) {
      gravacoes.push(request.url());
    }
  });
  await page.getByRole('link', { name: 'Quadras', exact: true }).click();
  await expect(page).toHaveURL(`/loteamentos/${SEMENTE_ID}#quadras`);
  await expect(
    page.getByRole('heading', { name: 'Quadras', exact: true }),
  ).toBeVisible();
  expect(gravacoes).toEqual([]);
});

/** Mesma origem do navegador: passa pelo proxy, como uma tela da FE-13 faria. */
function chamarApi(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ([metodo, caminho, corpo]) => {
      const response = await fetch(`/api/backend${caminho as string}`, {
        method: metodo as string,
        headers: { 'Content-Type': 'application/json' },
        ...(corpo ? { body: JSON.stringify(corpo) } : {}),
      });
      const text = await response.text();
      return {
        status: response.status,
        body: (text ? JSON.parse(text) : null) as { id: string } | null,
      };
    },
    [method, path, body] as const,
  );
}

test('cria, edita, não remove com quadras e remove sem quadras', async ({
  page,
}) => {
  test.slow();
  const nome = nomeUnico();
  const novoNome = `${nome} editado`;
  await entrar(page);
  await abrirListagem(page);

  // Criar
  await page.getByRole('link', { name: 'Novo loteamento' }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Novo loteamento' }),
  ).toBeVisible();
  await campoNome(page).fill(nome);
  await page.getByLabel('Descrição').fill('Descrição de teste');
  await page.getByLabel('Localização').fill('Toledo - PR');
  await page.getByRole('button', { name: 'Salvar' }).click();

  // O aviso some sozinho: confere antes de a página seguinte terminar de abrir.
  await expect(
    page.getByText('Loteamento cadastrado', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: nome }),
  ).toBeVisible();
  await expect(page.getByText('Toledo - PR')).toBeVisible();
  const id = page.url().split('/').at(-1) as string;

  // Nome repetido: o erro da API aparece no campo
  await page.goto('/loteamentos/novo');
  await expect(campoNome(page)).toBeEditable();
  await expect(async () => {
    await campoNome(page).fill(nome);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(campoNome(page)).toHaveAttribute('aria-invalid', 'true', {
      timeout: 2000,
    });
  }).toPass();
  await expect(page).toHaveURL('/loteamentos/novo');

  // Editar, limpando um campo opcional
  await page.goto(`/loteamentos/${id}/editar`);
  await expect(campoNome(page)).toHaveValue(nome);
  await campoNome(page).fill(novoNome);
  await page.getByLabel('Localização').fill('');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(
    page.getByText('Loteamento atualizado', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: novoNome }),
  ).toBeVisible();
  await expect(page.getByText('Toledo - PR')).toBeHidden();
  await expect(page.getByText('Não informada')).toBeVisible();

  // Com quadra: a API recusa, e o diálogo continua aberto com o motivo
  const quadra = await chamarApi(
    page,
    'POST',
    `/v1/loteamentos/${id}/quadras`,
    {
      numero: 'E2E-1',
    },
  );
  expect(quadra.status).toBe(201);

  const removerBotao = page.getByRole('button', {
    name: `Remover ${novoNome}`,
  });
  await removerBotao.click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByRole('button', { name: 'Remover loteamento' }).click();
  await expect(dialogo.getByRole('alert')).toContainText(/quadras/i);
  await expect(page).toHaveURL(`/loteamentos/${id}`);
  await dialogo.getByRole('button', { name: 'Voltar' }).click();

  // Sem quadra: remove e volta à listagem
  const semQuadra = await chamarApi(
    page,
    'DELETE',
    `/v1/quadras/${quadra.body?.id as string}`,
  );
  expect(semQuadra.status).toBe(204);

  await removerBotao.click();
  await dialogo.getByRole('button', { name: 'Remover loteamento' }).click();

  await expect(
    page.getByText('Loteamento removido', { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL('/loteamentos');

  await abrirListagem(page, `?q=${encodeURIComponent(novoNome)}`);
  await expect(
    page.getByText('Nenhum resultado para os filtros'),
  ).toBeVisible();
});

test.describe('com os dados da API falsa', () => {
  test.skip(SEM_API_FALSA, 'Depende dos usuários e dos dados da API falsa.');

  for (const email of ['comercial@exemplo.com', 'consulta@exemplo.com']) {
    test(`${email} só visualiza`, async ({ page }) => {
      test.slow();
      await entrar(page, email);
      await abrirListagem(page, `?q=${encodeURIComponent(SEMENTE)}`);

      await expect(
        page.getByRole('link', { name: SEMENTE, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Novo loteamento' }),
      ).toBeHidden();
      await expect(
        page.getByRole('columnheader', { name: 'Ações' }),
      ).toBeHidden();

      await page.getByRole('link', { name: SEMENTE, exact: true }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: SEMENTE }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Editar' })).toBeHidden();
      await expect(page.getByRole('button', { name: /Remover/ })).toBeHidden();

      for (const rota of [
        '/loteamentos/novo',
        `/loteamentos/${SEMENTE_ID}/editar`,
      ]) {
        const resposta = await page.goto(rota);
        expect(resposta?.status(), rota).toBe(403);
      }
    });
  }

  test('o Gestor vê as ações de edição', async ({ page }) => {
    await entrar(page, 'gestor@exemplo.com');
    await abrirListagem(page, `?q=${encodeURIComponent(SEMENTE)}`);

    await expect(
      page.getByRole('link', { name: 'Novo loteamento' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: `Editar ${SEMENTE}` }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: `Remover ${SEMENTE}` }),
    ).toBeVisible();
  });

  test('a busca vai para a URL e sobrevive ao recarregar', async ({ page }) => {
    await entrar(page);
    await abrirListagem(page);

    await page.getByLabel('Buscar por nome').fill('semente');

    await expect(page).toHaveURL('/loteamentos?q=semente');
    await expect(
      page.getByRole('link', { name: SEMENTE, exact: true }),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Buscar por nome')).toHaveValue('semente');
    await expect(
      page.getByRole('link', { name: SEMENTE, exact: true }),
    ).toBeVisible();
  });

  test('id inválido é 404, e id inexistente avisa na tela', async ({
    page,
  }) => {
    await entrar(page);

    const resposta = await page.goto('/loteamentos/nao-e-um-uuid');
    expect(resposta?.status()).toBe(404);

    await page.goto('/loteamentos/9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d');
    await expect(page.locator('main').getByRole('alert')).toContainText(
      'Loteamento não encontrado',
    );
    await expect(
      page.getByRole('link', { name: 'Voltar aos loteamentos' }),
    ).toBeVisible();
  });

  test('no celular, a listagem vira cartões sem rolagem horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await entrar(page);
    await abrirListagem(page, `?q=${encodeURIComponent(SEMENTE)}`);

    await expect(
      page.getByRole('button', { name: `Remover ${SEMENTE}` }),
    ).toBeVisible();
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

      test('as telas não têm violações de acessibilidade', async ({ page }) => {
        test.slow();
        await entrar(page);

        await abrirListagem(page, `?q=${encodeURIComponent(SEMENTE)}`);
        await expect(
          page.getByRole('link', { name: SEMENTE, exact: true }),
        ).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );

        await page.goto('/loteamentos/novo');
        await expect(campoNome(page)).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );

        await page.goto(`/loteamentos/${SEMENTE_ID}`);
        const remover = page.getByRole('button', {
          name: `Remover ${SEMENTE}`,
        });
        await remover.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      });
    });
  }
});
