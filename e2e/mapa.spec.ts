import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  ALTURA_PLANTA,
  ativarPlantaDeTeste,
  garantirPlantaAtiva,
  LARGURA_PLANTA,
} from './support/planta';

// O fluxo principal também roda contra o backend real, com E2E_API_URL, E2E_EMAIL e
// E2E_SENHA: envia uma imagem, espera o processamento e a ativa.
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const SEM_API_FALSA = !!process.env.E2E_API_URL;
const TILE = /\/plantas\/[^/]+\/tiles\/(\d+)\/(\d+)\/(\d+)\.webp/;
const ZOOM_MAXIMO = 3;
const LOTEAMENTO_SEMENTE_ID = '4f0d7a5c-2e96-4ecf-9b7d-6a1d5c9e3f54';

async function entrar(page: Page, email = EMAIL) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

function registrarTiles(page: Page) {
  const tiles: { z: number; status: number | null }[] = [];

  page.on('response', (response) => {
    const encontrado = TILE.exec(response.url());
    if (encontrado) {
      tiles.push({ z: Number(encontrado[1]), status: response.status() });
    }
  });

  return tiles;
}

test('carrega a planta, baixa só os tiles visíveis e dá zoom', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await entrar(page);
  await ativarPlantaDeTeste(page);
  const tiles = registrarTiles(page);

  await page.goto('/mapa');
  await expect(
    page.getByRole('application', { name: /^Planta / }),
  ).toBeVisible();
  await expect.poll(() => tiles.length).toBeGreaterThan(0);
  await page.waitForLoadState('networkidle');

  // No zoom inicial, a planta cabe na tela: só tiles desse nível, e todos existem.
  const zoomInicial = Math.max(...tiles.map(({ z }) => z));
  expect(new Set(tiles.map(({ z }) => z)).size).toBe(1);
  expect(tiles.every(({ status }) => status === 200)).toBe(true);

  // Afastar não vai além do que faz a planta caber na tela.
  await expect(page.getByRole('button', { name: 'Afastar' })).toBeDisabled();

  // Aproximar pede o nível seguinte.
  const aproximar = page.getByRole('button', { name: 'Aproximar' });
  await aproximar.click();
  await expect
    .poll(() => tiles.filter(({ z }) => z === zoomInicial + 1).length)
    .toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Afastar' })).toBeEnabled();

  // No zoom máximo, a imagem não cabe na tela: nem todo tile do nível é baixado.
  for (let zoom = zoomInicial + 1; zoom < ZOOM_MAXIMO; zoom += 1) {
    await aproximar.click();
    await expect.poll(() => tiles.some(({ z }) => z === zoom + 1)).toBe(true);
  }
  await expect(aproximar).toBeDisabled();
  await page.waitForLoadState('networkidle');
  const nivelMaximo = tiles.filter(({ z }) => z === ZOOM_MAXIMO);
  expect(nivelMaximo.length).toBeLessThan(
    Math.ceil(LARGURA_PLANTA / 256) * Math.ceil(ALTURA_PLANTA / 256),
  );
  expect(tiles.every(({ status }) => status === 200)).toBe(true);

  // Centralizar volta à planta inteira, e não há mais o que afastar.
  await page.getByRole('button', { name: 'Centralizar a planta' }).click();
  await expect(page.getByRole('button', { name: 'Afastar' })).toBeDisabled();
});

/**
 * Deixa no mapa o lote M1, disponível, no centro da planta, e o M2, bloqueado. A API
 * falsa já os tem; no backend real, são criados em um loteamento só para o teste.
 */
async function prepararLotes(page: Page, plantaId: string) {
  if (!SEM_API_FALSA) {
    return { loteamentoId: LOTEAMENTO_SEMENTE_ID };
  }

  async function criar(caminho: string, data: unknown = {}) {
    const resposta = await page.request.post(`/api/backend${caminho}`, {
      headers: { origin: new URL(page.url()).origin },
      data: data as object,
    });
    expect(resposta.ok(), `${caminho}: ${await resposta.text()}`).toBe(true);
    return (await resposta.json()) as { id: string };
  }

  const loteamento = await criar('/v1/loteamentos', {
    nome: `Loteamento do Mapa ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  });
  const quadra = await criar(`/v1/loteamentos/${loteamento.id}/quadras`, {
    numero: 'Q1',
  });

  for (const { numero, x, y } of [
    { numero: 'M1', x: 0.5, y: 0.5 },
    { numero: 'M2', x: 0.25, y: 0.25 },
  ]) {
    const lote = await criar('/v1/lotes', {
      quadraId: quadra.id,
      numero,
      areaM2: '360.00',
      valor: numero === 'M1' ? '250000.00' : null,
    });
    await criar(`/v1/plantas/${plantaId}/marcadores`, {
      loteId: lote.id,
      x,
      y,
    });
    if (numero === 'M2') {
      await criar(`/v1/lotes/${lote.id}/bloquear`, { motivo: 'Teste do mapa' });
    }
  }

  return { loteamentoId: loteamento.id };
}

test('filtra por status, abre o lote pelo marcador e encontra pela busca', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await entrar(page);
  const { id: plantaId } = await garantirPlantaAtiva(page);
  const { loteamentoId } = await prepararLotes(page, plantaId);

  await page.goto(`/mapa?loteamentoId=${loteamentoId}`);
  const mapa = page.getByRole('application', { name: /^Planta / });
  await expect(mapa).toBeVisible();
  await expect(page.getByText('2 lotes no mapa')).toBeVisible();

  const legenda = page.getByRole('list', { name: 'Legenda do mapa' });
  for (const status of ['Disponível', 'Reservado', 'Vendido', 'Bloqueado']) {
    await expect(legenda.getByText(status)).toBeVisible();
  }

  // O filtro vai para a URL, junto com o loteamento, e sobrevive ao recarregar
  await page.getByLabel('Status').selectOption({ label: 'Bloqueado' });
  await expect(page).toHaveURL(/status=BLOQUEADO/);
  await expect(page).toHaveURL(new RegExp(`loteamentoId=${loteamentoId}`));
  await expect(page.getByText('1 lote no mapa')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Status')).toHaveValue('BLOQUEADO');
  await expect(page.getByText('1 lote no mapa')).toBeVisible();
  await page.getByLabel('Status').selectOption({ label: 'Todos' });
  await expect(page.getByText('2 lotes no mapa')).toBeVisible();

  // O M1 está no centro da planta, que começa centralizada
  await expect(page.getByRole('button', { name: 'Afastar' })).toBeDisabled();
  const caixa = await mapa.boundingBox();
  await page.mouse.click(
    (caixa?.x ?? 0) + (caixa?.width ?? 0) / 2,
    (caixa?.y ?? 0) + (caixa?.height ?? 0) / 2,
  );
  const painel = page.getByRole('dialog', { name: 'Lote M1' });
  await expect(painel).toBeVisible();
  await expect(painel.getByText('Q1')).toBeVisible();
  await expect(painel.getByText('360,00 m²')).toBeVisible();
  await expect(painel.getByText('R$ 250.000,00')).toBeVisible();
  await expect(painel.getByText('Disponível')).toBeVisible();
  await expect(
    painel.getByRole('link', { name: 'Ver detalhes do lote' }),
  ).toHaveAttribute('href', /^\/lotes\/[\w-]+$/);
  await painel.getByRole('button', { name: 'Fechar' }).click();
  await expect(painel).toBeHidden();

  // A busca aproxima até o marcador, e os dados também se abrem sem o mouse
  await expect(page.getByRole('button', { name: 'Aproximar' })).toBeEnabled();
  await page.getByLabel('Buscar lote por número').fill('m2');
  await page.getByRole('button', { name: /^Lote M2, quadra Q1/ }).click();
  await expect(page.getByRole('button', { name: 'Aproximar' })).toBeDisabled();
  await page.getByRole('button', { name: 'Ver dados do lote' }).click();
  const painelBuscado = page.getByRole('dialog', { name: 'Lote M2' });
  await expect(painelBuscado.getByText('Bloqueado')).toBeVisible();
  await expect(painelBuscado.getByText('Não definido')).toBeVisible();
});

test.describe('com os usuários da API falsa', () => {
  test.skip(SEM_API_FALSA, 'Depende dos usuários da API falsa.');

  test('no celular, o painel do lote sobe de baixo', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 360, height: 740 });
    await entrar(page, 'gestor@exemplo.com');
    await garantirPlantaAtiva(page);

    await page.goto(`/mapa?loteamentoId=${LOTEAMENTO_SEMENTE_ID}`);
    await page.getByLabel('Buscar lote por número').fill('M1');
    await page.getByRole('button', { name: /^Lote M1, quadra Q1/ }).click();
    await page.getByRole('button', { name: 'Ver dados do lote' }).click();

    const painel = page.getByRole('dialog', { name: 'Lote M1' });
    await expect(painel).toBeVisible();
    await expect
      .poll(async () => {
        const caixa = await painel.boundingBox();
        return Math.round((caixa?.y ?? 0) + (caixa?.height ?? 0));
      })
      .toBe(740);
    expect((await painel.boundingBox())?.width).toBe(360);
  });

  test('Consulta vê o mapa, sem controles de cadastro', async ({ page }) => {
    test.setTimeout(120_000);
    await entrar(page, 'gestor@exemplo.com');
    await ativarPlantaDeTeste(page);
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login/);

    await entrar(page, 'consulta@exemplo.com');
    await page.goto('/mapa');

    await expect(
      page.getByRole('application', { name: /^Planta / }),
    ).toBeVisible();
  });

  test('no celular, o mapa não cria rolagem horizontal', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 360, height: 740 });
    await entrar(page, 'gestor@exemplo.com');
    await ativarPlantaDeTeste(page);

    await page.goto('/mapa');

    await expect(
      page.getByRole('application', { name: /^Planta / }),
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

      test('o mapa não tem violações de acessibilidade', async ({ page }) => {
        test.setTimeout(120_000);
        await entrar(page, 'gestor@exemplo.com');
        await ativarPlantaDeTeste(page);

        await page.goto('/mapa');
        await expect(
          page.getByRole('application', { name: /^Planta / }),
        ).toBeVisible();

        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      });
    });
  }
});
