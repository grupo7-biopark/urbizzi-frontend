import {
  test as base,
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { components } from '../../src/shared/api/schema';
import { gerarCpf } from './documento';

type Scenario = {
  accounts: Record<
    'gestor' | 'comercial' | 'outro' | 'consulta',
    { id: string; nome: string }
  >;
  suffix: string;
  plantaId: string;
};
type Lote = components['schemas']['LoteDto'];
type Cliente = components['schemas']['ClienteDto'];

export async function api<T>(
  request: APIRequestContext,
  method: 'POST' | 'GET',
  path: string,
  data?: unknown,
): Promise<T> {
  const response = await request.fetch(`/api/backend/v1${path}`, {
    method,
    data,
    headers: { Origin: String(test.info().project.use.baseURL) },
  });
  expect(response.ok(), `${method} ${path}: HTTP ${response.status()}`).toBe(
    true,
  );
  return response.status() === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

export const test = base.extend<{
  scenario: Scenario;
  cenario: { lote: Lote; cliente: Cliente };
}>({
  scenario: async ({ baseURL }, use) => {
    if (!baseURL)
      throw new Error('Configure E2E_BASE_URL e o backend real de teste.');
    await use(
      JSON.parse(await readFile('e2e/.auth/scenario.json', 'utf8')) as Scenario,
    );
  },
  cenario: async ({ request }, use, testInfo) => {
    const nome = `E2E ${testInfo.project.name} ${Date.now()}-${testInfo.testId.slice(-6)}`;
    const loteamento = await api<components['schemas']['LoteamentoDto']>(
      request,
      'POST',
      '/loteamentos',
      { nome },
    );
    const quadra = await api<components['schemas']['QuadraDto']>(
      request,
      'POST',
      `/loteamentos/${loteamento.id}/quadras`,
      { numero: 'A' },
    );
    const lote = await api<Lote>(request, 'POST', '/lotes', {
      quadraId: quadra.id,
      numero: '12',
      areaM2: '360.00',
      valor: '250000.00',
      exibirValorPublico: true,
    });
    const cliente = await api<Cliente>(request, 'POST', '/clientes', {
      nome: `Cliente ${nome}`,
      documento: gerarCpf(),
      telefone: '45999999999',
    });
    await use({ lote, cliente });
  },
});

export { expect };

export async function reservar(page: Page, cliente: string) {
  await page.getByRole('button', { name: 'Reservar' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').fill(cliente);
  await dialog.getByRole('option', { name: cliente, exact: true }).click();
  await expect(dialog.getByText(/Vencimento previsto/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirmar reserva' }).click();
  await expect(page.getByText('Reserva criada', { exact: true })).toBeVisible();
}

export async function como(browser: Browser, role: string, testInfo: TestInfo) {
  const { baseURL, viewport, isMobile, hasTouch } = testInfo.project.use;
  const context = await browser.newContext({
    baseURL,
    viewport,
    isMobile,
    hasTouch,
    extraHTTPHeaders: { Origin: String(baseURL) },
    storageState: `e2e/.auth/${role}.json`,
  });
  return { context, page: await context.newPage() };
}
