import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { crc32, deflateSync } from 'node:zlib';

// O fluxo principal também roda contra o backend real, com E2E_API_URL, E2E_EMAIL e
// E2E_SENHA: envia uma imagem, espera o processamento e a ativa.
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const SEM_API_FALSA = !!process.env.E2E_API_URL;
const TILE = /\/plantas\/[^/]+\/tiles\/(\d+)\/(\d+)\/(\d+)\.webp/;
// Dimensões da imagem do teste: 3 níveis de zoom além do tile único.
const LARGURA = 2048;
const ALTURA = 1536;
const ZOOM_MAXIMO = 3;

async function entrar(page: Page, email = EMAIL) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

function chunkPng(tipo: string, dados: Buffer) {
  const corpo = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]);
  const tamanho = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  tamanho.writeUInt32BE(dados.length);
  crc.writeUInt32BE(crc32(corpo));

  return Buffer.concat([tamanho, corpo, crc]);
}

/** PNG cinza, válido para a API, que lê as dimensões do conteúdo. */
function makePng(largura: number, altura: number) {
  const cabecalho = Buffer.alloc(13);

  cabecalho.writeUInt32BE(largura, 0);
  cabecalho.writeUInt32BE(altura, 4);
  cabecalho[8] = 8; // bits por canal
  cabecalho[9] = 0; // tons de cinza

  // Cada linha começa com o byte do filtro: 0 é "sem filtro".
  const pixels = Buffer.alloc((largura + 1) * altura, 0x80);

  for (let linha = 0; linha < altura; linha += 1) {
    pixels[linha * (largura + 1)] = 0;
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunkPng('IHDR', cabecalho),
    chunkPng('IDAT', deflateSync(pixels)),
    chunkPng('IEND', Buffer.alloc(0)),
  ]);
}

async function ativarPlantaDeTeste(page: Page) {
  // Como um navegador faria: sem a origem, o proxy recusa a escrita.
  const headers = { origin: new URL(page.url()).origin };
  const envio = await page.request.post('/api/backend/v1/plantas', {
    headers,
    multipart: {
      nome: `Planta do mapa ${Date.now()}`,
      arquivos: {
        name: 'planta.png',
        mimeType: 'image/png',
        buffer: makePng(LARGURA, ALTURA),
      },
    },
  });
  expect(envio.status(), await envio.text()).toBe(201);
  const { id } = (await envio.json()) as { id: string };

  // A listagem avança o status na API falsa; na real, quem avança é o worker.
  await expect
    .poll(
      async () => {
        const lista = await page.request.get(
          '/api/backend/v1/plantas?page=1&pageSize=20',
        );
        const { data } = (await lista.json()) as {
          data: { id: string; status: string }[];
        };
        return data.find((planta) => planta.id === id)?.status;
      },
      { timeout: 120_000, intervals: [1000] },
    )
    .toBe('PRONTA');

  const ativacao = await page.request.post(
    `/api/backend/v1/plantas/${id}/ativar`,
    { headers },
  );
  expect(ativacao.ok(), await ativacao.text()).toBe(true);
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
    Math.ceil(LARGURA / 256) * Math.ceil(ALTURA / 256),
  );
  expect(tiles.every(({ status }) => status === 200)).toBe(true);

  // Centralizar volta à planta inteira, e não há mais o que afastar.
  await page.getByRole('button', { name: 'Centralizar a planta' }).click();
  await expect(page.getByRole('button', { name: 'Afastar' })).toBeDisabled();
});

test.describe('com os usuários da API falsa', () => {
  test.skip(SEM_API_FALSA, 'Depende dos usuários da API falsa.');

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
