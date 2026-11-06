import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { garantirPlantaAtiva } from './support/planta';

// O fluxo principal também roda contra o backend real, com E2E_API_URL, E2E_EMAIL e
// E2E_SENHA. Os demais usam os usuários da API falsa (e2e/support/fake-api.mjs).
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const SEM_API_FALSA = !!process.env.E2E_API_URL;

type Marcador = { id: string; loteId: string; x: number; y: number };

async function entrar(page: Page, email = EMAIL) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

function sufixo() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function criar(page: Page, caminho: string, data: object) {
  const resposta = await page.request.post(`/api/backend${caminho}`, {
    headers: { origin: new URL(page.url()).origin },
    data,
  });
  expect(resposta.ok(), `${caminho}: ${await resposta.text()}`).toBe(true);
  return (await resposta.json()) as { id: string };
}

async function criarLotes(page: Page, numeros: string[]) {
  const nome = `Loteamento do Editor ${sufixo()}`;
  const loteamento = await criar(page, '/v1/loteamentos', { nome });
  const quadra = await criar(page, `/v1/loteamentos/${loteamento.id}/quadras`, {
    numero: 'Q1',
  });
  const lotes: Record<string, string> = {};

  for (const numero of numeros) {
    const lote = await criar(page, '/v1/lotes', {
      quadraId: quadra.id,
      numero,
      areaM2: '360.00',
    });
    lotes[numero] = lote.id;
  }

  return { nome, lotes };
}

async function lerMarcadores(page: Page, plantaId: string) {
  const resposta = await page.request.get(
    `/api/backend/v1/plantas/${plantaId}/marcadores?page=1&pageSize=100`,
  );
  return ((await resposta.json()) as { data: Marcador[] }).data;
}

/** Ponto na tela, a partir do centro do mapa: a caixa muda quando o layout muda. */
async function noMapa(page: Page, dx: number, dy: number) {
  const caixa = await page
    .getByRole('application', { name: /^Planta / })
    .boundingBox();

  return {
    x: (caixa?.x ?? 0) + (caixa?.width ?? 0) / 2 + dx,
    y: (caixa?.y ?? 0) + (caixa?.height ?? 0) / 2 + dy,
  };
}

async function clicarNoMapa(page: Page, dx: number, dy: number) {
  const { x, y } = await noMapa(page, dx, dy);
  await page.mouse.click(x, y);
}

async function arrastarNoMapa(
  page: Page,
  de: [number, number],
  para: [number, number],
) {
  const inicio = await noMapa(page, ...de);
  const fim = await noMapa(page, ...para);

  await page.mouse.move(inicio.x, inicio.y);
  await page.mouse.down();
  await page.mouse.move(fim.x, fim.y, { steps: 5 });
  await page.mouse.up();
}

async function abrirEditor(page: Page, loteamento?: string) {
  await page.goto('/mapa/editor');
  await expect(
    page.getByRole('application', { name: /^Planta / }),
  ).toBeVisible();
  // O botão fica ativo só depois de o mapa calcular o zoom, já com a tela hidratada.
  await expect(page.getByRole('button', { name: 'Afastar' })).toBeDisabled();
  if (loteamento) {
    await expect(page.getByRole('option', { name: loteamento })).toBeAttached();
    await page.getByLabel('Loteamento').selectOption({ label: loteamento });
  }
}

function botaoSalvar(page: Page) {
  return page.getByRole('button', { name: /^Salvar/ });
}

test('cria, vincula, arrasta e salva, e a lista de pendentes diminui', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await entrar(page);
  const { id: plantaId } = await garantirPlantaAtiva(page);
  const { nome, lotes } = await criarLotes(page, ['E1', 'E2']);

  // Pelo mapa, com a ação na tela
  await page.goto('/mapa');
  await page.getByRole('link', { name: 'Editar marcadores' }).click();
  await expect(page).toHaveURL('/mapa/editor');
  await abrirEditor(page, nome);
  await expect(page.getByText('2 lotes sem marcador')).toBeVisible();
  await expect(botaoSalvar(page)).toBeDisabled();

  // Escolher o lote e clicar na planta
  await page.getByRole('button', { name: /^Lote E1/ }).click();
  await expect(page.getByRole('button', { name: /^Lote E1/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await clicarNoMapa(page, -60, -40);
  await expect(page.getByText('1 lote sem marcador')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar (1)' })).toBeEnabled();

  // Clicar na planta e depois vincular: sem lote, não dá para salvar
  await clicarNoMapa(page, 60, 40);
  await expect(page.getByText('Escolha na lista o lote')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar (2)' })).toBeDisabled();
  await page.getByRole('button', { name: /^Lote E2/ }).click();
  await expect(page.getByText('0 lotes sem marcador')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar (2)' })).toBeEnabled();

  // Arrastar não cria outro marcador
  await arrastarNoMapa(page, [60, 40], [100, 70]);
  await expect(page.getByRole('button', { name: 'Salvar (2)' })).toBeEnabled();

  // Salvar em lote
  await botaoSalvar(page).click();
  await expect(
    page.getByText('Marcadores salvos', { exact: true }),
  ).toBeVisible();
  await expect(botaoSalvar(page)).toBeDisabled();

  const salvos = await lerMarcadores(page, plantaId);
  const e1 = salvos.find(({ loteId }) => loteId === lotes.E1) as Marcador;
  const e2 = salvos.find(({ loteId }) => loteId === lotes.E2) as Marcador;
  expect(e1.x).toBeLessThan(0.5);
  // O E2 foi criado a 60 px do centro e solto a 100: fica onde foi solto. O E1, a
  // 60 px do centro, dá a escala da planta na tela.
  const fracaoPorPixel = (0.5 - e1.x) / 60;
  expect(e2.x).toBeCloseTo(0.5 + 100 * fracaoPorPixel, 2);

  // A posição salva reaparece igual, e a lista continua menor
  await abrirEditor(page, nome);
  await expect(page.getByText('0 lotes sem marcador')).toBeVisible();
  const relidos = await lerMarcadores(page, plantaId);
  expect(relidos.find(({ id }) => id === e2.id)).toMatchObject({
    x: e2.x,
    y: e2.y,
  });

  // Mover um salvo, avisar ao sair e descartar
  await arrastarNoMapa(page, [100, 70], [120, 90]);
  await expect(page.getByRole('button', { name: 'Salvar (1)' })).toBeEnabled();
  await page.getByRole('link', { name: 'Lotes', exact: true }).first().click();
  const aviso = page.getByRole('dialog', { name: 'Sair sem salvar?' });
  await expect(aviso).toBeVisible();
  await aviso.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(page).toHaveURL('/mapa/editor');
  await page.getByRole('button', { name: 'Descartar alterações' }).click();
  await expect(botaoSalvar(page)).toBeDisabled();
  expect(
    (await lerMarcadores(page, plantaId)).find(({ id }) => id === e2.id),
  ).toMatchObject({ x: e2.x, y: e2.y });

  // Remover volta o lote para a lista, e no mapa fica só o que restou
  await clicarNoMapa(page, 100, 70);
  await page.getByRole('button', { name: 'Remover marcador' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Remover marcador' })
    .click();
  await expect(
    page.getByText('Marcador removido', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('1 lote sem marcador')).toBeVisible();
  expect(
    (await lerMarcadores(page, plantaId)).some(({ id }) => id === e2.id),
  ).toBe(false);

  // Não deixa marcador de teste no caminho da próxima execução.
  const limpeza = await page.request.delete(
    `/api/backend/v1/plantas/${plantaId}/marcadores/${e1.id}`,
    { headers: { origin: new URL(page.url()).origin } },
  );
  expect(limpeza.status()).toBe(204);
});

test.describe('com os usuários da API falsa', () => {
  test.skip(SEM_API_FALSA, 'Depende dos usuários da API falsa.');

  for (const email of ['comercial@exemplo.com', 'consulta@exemplo.com']) {
    test(`${email} não acessa o editor`, async ({ page }) => {
      await entrar(page, email);

      const resposta = await page.goto('/mapa/editor');
      expect(resposta?.status()).toBe(403);

      await page.goto('/mapa');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Mapa' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Editar marcadores' }),
      ).toBeHidden();
    });
  }

  test('um marcador a revisar pode ser confirmado', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await entrar(page, 'gestor@exemplo.com');
    const { id: plantaId } = await garantirPlantaAtiva(page);
    const numero = `REV-${sufixo()}`;
    const { lotes } = await criarLotes(page, [numero]);
    await criar(page, `/v1/plantas/${plantaId}/marcadores/lote`, {
      // No canto: os testes rodam em paralelo, e o principal clica perto do centro.
      marcadores: [{ loteId: lotes[numero], x: 0.95, y: 0.05 }],
    });

    await abrirEditor(page);
    const lista = page.getByRole('list', { name: 'Marcadores a revisar' });
    await lista.getByRole('button', { name: new RegExp(numero) }).click();
    await page.getByRole('button', { name: 'Marcar como revisado' }).click();

    await expect(
      page.getByText('Marcador revisado', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Marcar como revisado' }),
    ).toBeHidden();
  });

  test('sem mouse, posiciona pelo centro da tela', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 360, height: 740 });
    await entrar(page, 'gestor@exemplo.com');
    await garantirPlantaAtiva(page);
    const { nome } = await criarLotes(page, ['C1']);

    await abrirEditor(page, nome);
    await page.getByRole('button', { name: /^Lote C1/ }).click();
    await page
      .getByRole('button', { name: 'Colocar no centro da tela' })
      .click();

    await expect(
      page.getByRole('button', { name: 'Salvar (1)' }),
    ).toBeEnabled();
    await expect(page.getByText('0 lotes sem marcador')).toBeVisible();
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

      test('o editor não tem violações de acessibilidade', async ({ page }) => {
        test.setTimeout(180_000);
        await entrar(page, 'gestor@exemplo.com');
        await garantirPlantaAtiva(page);
        const { nome } = await criarLotes(page, ['A1', 'A2']);

        await abrirEditor(page, nome);
        await expect(page.getByText('2 lotes sem marcador')).toBeVisible();
        await page.getByRole('button', { name: /^Lote A1/ }).click();
        await expect(
          page.getByRole('button', { name: /^Lote A1/ }),
        ).toHaveAttribute('aria-pressed', 'true');

        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      });
    });
  }
});
