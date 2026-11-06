import { expect, type Page } from '@playwright/test';
import { crc32, deflateSync } from 'node:zlib';

// Dimensões da imagem do teste: 3 níveis de zoom além do tile único.
export const LARGURA_PLANTA = 2048;
export const ALTURA_PLANTA = 1536;

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

export async function ativarPlantaDeTeste(page: Page) {
  // Como um navegador faria: sem a origem, o proxy recusa a escrita.
  const headers = { origin: new URL(page.url()).origin };
  const envio = await page.request.post('/api/backend/v1/plantas', {
    headers,
    multipart: {
      nome: `Planta do mapa ${Date.now()}`,
      arquivos: {
        name: 'planta.png',
        mimeType: 'image/png',
        buffer: makePng(LARGURA_PLANTA, ALTURA_PLANTA),
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

export async function garantirPlantaAtiva(page: Page) {
  const ativa = await page.request.get('/api/backend/v1/plantas/ativa');

  if (!ativa.ok()) {
    await ativarPlantaDeTeste(page);
  }

  return (
    await page.request.get('/api/backend/v1/plantas/ativa')
  ).json() as Promise<{
    id: string;
  }>;
}
