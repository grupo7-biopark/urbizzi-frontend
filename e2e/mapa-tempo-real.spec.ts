import { expect, test, type Page } from '@playwright/test';
import { gerarCpf } from './support/documento';
import { temCorNoMapa } from './support/mapa';
import { garantirPlantaAtiva } from './support/planta';

const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const SEM_API_FALSA = !!process.env.E2E_API_URL;

test.skip(
  SEM_API_FALSA,
  'O fluxo SSE do e2e é servido pela API falsa; o backend real tem cobertura própria.',
);

async function entrar(page: Page) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

function origem(page: Page) {
  return new URL(page.url()).origin;
}

async function criar<T>(
  page: Page,
  caminho: string,
  data: unknown,
): Promise<T> {
  const resposta = await page.request.post(`/api/backend${caminho}`, {
    headers: { origin: origem(page) },
    data: data as Record<string, unknown>,
  });
  expect(
    resposta.ok(),
    `${caminho}: ${resposta.status()} ${await resposta.text()}`,
  ).toBe(true);
  return (await resposta.json()) as T;
}

/** Um loteamento só deste teste, com um lote marcado no centro da planta. */
async function preparar(page: Page) {
  const sufixo = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const loteamento = await criar<{ id: string }>(page, '/v1/loteamentos', {
    nome: `Tempo real ${sufixo}`,
  });

  const quadraDoLote = await criar<{ id: string }>(
    page,
    `/v1/loteamentos/${loteamento.id}/quadras`,
    { numero: 'A' },
  );
  const lote = await criar<{ id: string }>(page, '/v1/lotes', {
    quadraId: quadraDoLote.id,
    numero: 'TR1',
    areaM2: '360.00',
    valor: '250000.00',
  });
  const cliente = await criar<{ id: string }>(page, '/v1/clientes', {
    nome: `Cliente Tempo Real ${sufixo}`,
    documento: gerarCpf(),
  });
  const planta = await garantirPlantaAtiva(page);
  await criar(page, `/v1/plantas/${planta.id}/marcadores/lote`, {
    marcadores: [{ loteId: lote.id, x: 0.5, y: 0.5 }],
  });

  return {
    loteamentoId: loteamento.id,
    loteId: lote.id,
    clienteId: cliente.id,
  };
}

async function reservar(page: Page, loteId: string, clienteId: string) {
  const resposta = await page.request.post('/api/backend/v1/reservas', {
    headers: { origin: origem(page) },
    data: { loteId, clienteId },
  });
  expect(resposta.status(), await resposta.text()).toBe(201);
}

test('duas abas veem a reserva feita em uma delas', async ({
  context,
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await entrar(page);
  const { loteamentoId, loteId, clienteId } = await preparar(page);

  const outra = await context.newPage();
  await outra.setViewportSize({ width: 1280, height: 900 });
  for (const aba of [page, outra]) {
    await aba.goto(`/mapa?loteamentoId=${loteamentoId}`);
    await expect(
      aba.getByRole('application', { name: /^Planta / }),
    ).toBeVisible();
    await expect(aba.getByText('Ao vivo', { exact: true })).toBeVisible();
    await expect
      .poll(() => temCorNoMapa(aba, '--status-disponivel'))
      .toBe(true);
  }

  // A reserva é o mesmo comando da tela; a API falsa avisa os assinantes do SSE.
  await reservar(page, loteId, clienteId);

  // O painel aberto depois do evento já lê o status confirmado.
  await outra.getByLabel('Buscar lote por número').fill('TR1');
  await outra.getByRole('button', { name: /^Lote TR1, quadra/ }).click();
  await outra.getByRole('button', { name: 'Ver dados do lote' }).click();
  await expect(
    outra
      .getByRole('dialog', { name: 'Lote TR1' })
      .getByText('Reservado', { exact: true }),
  ).toBeVisible();

  await expect.poll(() => temCorNoMapa(outra, '--status-reservado')).toBe(true);
  await expect
    .poll(() => temCorNoMapa(outra, '--status-disponivel'))
    .toBe(false);

  await outra.close();
});

test('o link público acompanha a mudança de status', async ({
  context,
  page,
}) => {
  test.setTimeout(240_000);
  await entrar(page);
  const { loteamentoId, loteId, clienteId } = await preparar(page);
  const link = await criar<{ token: string }>(page, '/v1/links-publicos', {
    loteamentoId,
  });

  const anonimo = await context.browser()!.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1024, height: 800 },
  });
  const publica = await anonimo.newPage();
  try {
    await publica.goto(`/p/${link.token}`);
    await expect(
      publica.getByRole('heading', { name: 'Mapa público', exact: true }),
    ).toBeVisible();
    await expect(publica.getByText('Ao vivo', { exact: true })).toBeVisible();
    await expect(
      publica.getByText('Disponível', { exact: true }),
    ).toBeVisible();

    await reservar(page, loteId, clienteId);

    await expect(publica.getByText('Reservado', { exact: true })).toBeVisible();
  } finally {
    await anonimo.close();
  }
});
