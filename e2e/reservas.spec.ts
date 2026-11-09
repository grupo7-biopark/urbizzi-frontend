import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { components } from '../src/shared/api/schema';
import { gerarCpf } from './support/documento';

const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const CONCORRENTE =
  process.env.E2E_RESERVA_CONCORRENTE_EMAIL ?? 'comercial@exemplo.com';
const SENHA_CONCORRENTE = process.env.E2E_RESERVA_CONCORRENTE_SENHA ?? SENHA;

function headers() {
  return { origin: test.info().project.use.baseURL ?? 'http://localhost:3001' };
}

async function entrar(api: APIRequestContext, email = EMAIL, senha = SENHA) {
  const response = await api.post('/api/auth/login', {
    headers: headers(),
    data: { email, senha },
  });
  expect(response.status()).toBe(204);
}

async function criar<T>(
  api: APIRequestContext,
  rota: string,
  data: unknown,
): Promise<T> {
  const response = await api.post(`/api/backend/v1/${rota}`, {
    headers: headers(),
    data,
  });
  expect(response.status(), `POST /v1/${rota}`).toBe(201);
  return response.json();
}

async function preparar(page: Page) {
  test.slow();
  await entrar(page.request);
  const sufixo = randomUUID().slice(0, 8);
  const loteamento = await criar<{ id: string }>(page.request, 'loteamentos', {
    nome: `Residencial Reserva ${sufixo}`,
  });
  const quadra = await criar<{ id: string }>(
    page.request,
    `loteamentos/${loteamento.id}/quadras`,
    { numero: 'A' },
  );
  const lote = await criar<components['schemas']['LoteDto']>(
    page.request,
    'lotes',
    {
      quadraId: quadra.id,
      numero: 'FE19',
      areaM2: '360.00',
    },
  );
  const cliente = await criar<components['schemas']['ClienteDto']>(
    page.request,
    'clientes',
    {
      nome: `Cliente Reserva ${sufixo}`,
      documento: gerarCpf(),
    },
  );
  await page.goto(`/lotes/${lote.id}`);
  await expect(page.getByText('Disponível', { exact: true })).toBeVisible();
  return { lote, cliente };
}

async function abrirReserva(page: Page) {
  const responsePromise = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname.endsWith('/v1/reservas/previsao') && r.ok(),
  );
  await page.getByRole('button', { name: 'Reservar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Reservar lote' });
  const previsao: components['schemas']['PrevisaoReservaDto'] = await (
    await responsePromise
  ).json();
  await expect(dialog.getByText('Vencimento previsto')).toBeVisible();
  await expect(dialog.locator('time')).toHaveAttribute(
    'datetime',
    previsao.dataVencimento,
  );
  return dialog;
}

async function escolherCliente(page: Page, nome: string) {
  await page.getByRole('combobox', { name: 'Cliente' }).fill(nome);
  await page.getByRole('option', { name: nome, exact: true }).click();
}

async function confirmar(page: Page, status: number) {
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname.endsWith('/v1/reservas') &&
      r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();
  const resultado = await response;
  expect(resultado.status()).toBe(status);
  await expect(page.getByText('Reservado', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Reservar lote' }),
  ).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Reservar', exact: true }),
  ).toHaveCount(0);
  return resultado;
}

test('reserva para cliente existente e atualiza o lote sem recarregar', async ({
  page,
}) => {
  const { lote, cliente } = await preparar(page);
  const inicioDocumento = await page.evaluate(() => performance.timeOrigin);
  await abrirReserva(page);
  await escolherCliente(page, cliente.nome);
  const resposta = await confirmar(page, 201);
  expect(await resposta.json()).toMatchObject({
    loteId: lote.id,
    clienteId: cliente.id,
    status: 'ATIVA',
  });
  await expect(page.getByText(cliente.nome, { exact: true })).toBeVisible();
  await expect(page.getByText('Reserva criada', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(
    inicioDocumento,
  );
});

test('cadastra um cliente dentro do modal e o usa na reserva', async ({
  page,
}) => {
  const { lote } = await preparar(page);
  const dialog = await abrirReserva(page);
  const nome = `Cliente Novo ${randomUUID().slice(0, 8)}`;
  await dialog.getByRole('combobox', { name: 'Cliente' }).fill(nome);
  await dialog.getByRole('option', { name: 'Cadastrar novo cliente' }).click();
  await dialog.getByRole('textbox', { name: 'Nome' }).fill(nome);
  await dialog.getByRole('textbox', { name: 'CPF ou CNPJ' }).fill(gerarCpf());
  await dialog.getByRole('button', { name: 'Salvar cliente' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Cliente' })).toHaveValue(
    nome,
  );
  await expect(page).toHaveURL(`/lotes/${lote.id}`);
  await confirmar(page, 201);
  await expect(page.getByText(nome, { exact: true })).toBeVisible();
});

test('trata 409 quando outro vendedor reserva enquanto o modal está aberto', async ({
  page,
  browser,
  baseURL,
}) => {
  const { lote, cliente } = await preparar(page);
  await abrirReserva(page);
  await escolherCliente(page, cliente.nome);
  const concorrente = await browser.newContext({ baseURL });
  try {
    await entrar(concorrente.request, CONCORRENTE, SENHA_CONCORRENTE);
    const vencedor = await criar<components['schemas']['ReservaDto']>(
      concorrente.request,
      'reservas',
      { loteId: lote.id, clienteId: cliente.id },
    );
    await confirmar(page, 409);
    await expect(
      page.getByText('O lote não está mais disponível para reserva', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText('Reserva criada', { exact: true })).toHaveCount(
      0,
    );
    const detalhe = await page.request.get(
      `/api/backend/v1/lotes/${lote.id}/detalhe`,
    );
    expect((await detalhe.json()).reserva.id).toBe(vencedor.id);
  } finally {
    await concorrente.close();
  }
});

test('Consulta vê o lote disponível sem ação de reserva', async ({ page }) => {
  test.skip(
    !!process.env.E2E_API_URL,
    'Depende do usuário Consulta da API simulada.',
  );
  const { lote } = await preparar(page);
  await entrar(page.request, 'consulta@exemplo.com');
  await page.goto(`/lotes/${lote.id}`);
  await expect(page.getByText('Disponível', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Reservar', exact: true }),
  ).toHaveCount(0);
});
