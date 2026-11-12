import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { makeProposta } from '../src/test/factories/proposta.factory';
import { makeLote } from '../src/test/factories/lote.factory';
import { makeCliente } from '../src/test/factories/cliente.factory';
import { entrar, excessoHorizontal } from './support/sessao';

test.skip(
  !!process.env.E2E_API_URL,
  'Os fluxos com a API real estão em pendencias-real.spec.ts.',
);

for (const decisao of ['aprovar', 'rejeitar'] as const) {
  test(`gestor consegue ${decisao}, com motivo, e atualiza a fila e o contador`, async ({
    page,
  }) => {
    const propostas = [
      makeProposta({
        atrasada: true,
        prazoLimite: '2020-11-01T12:00:00Z',
        condicoes: 'Oferta atrasada',
      }),
      makeProposta({
        id: '11111111-1111-4111-8111-111111111111',
        condicoes: 'Oferta no prazo',
      }),
    ];
    const cliente = makeCliente();
    const lote = makeLote({ status: 'RESERVADO' });
    const pedidos: unknown[] = [];
    await page.route('**/api/backend/v1/propostas/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/pendentes')) {
        const pendentes = propostas.filter((p) => p.status === 'EM_ANALISE');
        const pageSize = Number(url.searchParams.get('pageSize'));
        return route.fulfill({
          json: {
            data: pendentes.slice(0, pageSize),
            meta: {
              page: 1,
              pageSize,
              total: pendentes.length,
              totalPages: Math.ceil(pendentes.length / pageSize),
            },
          },
        });
      }
      if (route.request().method() === 'POST') {
        pedidos.push(route.request().postDataJSON());
        propostas[0].status = decisao === 'aprovar' ? 'APROVADA' : 'REJEITADA';
      }
      return route.fulfill({ json: propostas[0] });
    });
    await page.route(
      `**/api/backend/v1/reservas/${propostas[0].reservaId}`,
      (route) =>
        route.fulfill({
          json: {
            id: propostas[0].reservaId,
            loteId: lote.id,
            clienteId: cliente.id,
            vendedorId: propostas[0].vendedorId,
            status: 'ATIVA',
            dataInicio: '2026-11-01T12:00:00Z',
            dataVencimento: '2099-12-01T12:00:00Z',
            tempoRestanteSegundos: 10000,
          },
        }),
    );
    await page.route(`**/api/backend/v1/lotes/${lote.id}`, (route) =>
      route.fulfill({ json: lote }),
    );
    await page.route(`**/api/backend/v1/clientes/${cliente.id}`, (route) =>
      route.fulfill({ json: cliente }),
    );
    await entrar(
      page,
      decisao === 'aprovar' ? 'gestor@exemplo.com' : 'pessoa@exemplo.com',
    );
    await page.getByRole('link', { name: 'Pendências', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Pendências', exact: true }),
    ).toBeVisible();
    const tabela = page.getByRole('table', { name: 'Propostas pendentes' });
    await expect(tabela.getByRole('row').nth(1)).toContainText('Em atraso');
    await expect(tabela.getByRole('row').nth(2)).toContainText('No prazo');
    await expect(page.getByLabel('2 propostas pendentes')).toBeVisible();
    if (process.env.E2E_CAPTURAS_FE23 && decisao === 'aprovar') {
      await mkdir('docs/capturas', { recursive: true });
      await page.screenshot({
        path: 'docs/capturas/fe23-pendencias-desktop-claro.png',
        fullPage: true,
      });
    }
    await tabela
      .getByRole('button', { name: 'Analisar proposta' })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('link', { name: cliente.nome }),
    ).toBeVisible();
    await expect(
      dialog.getByText(/aprovação da proposta mantém o lote reservado/),
    ).toBeVisible();
    await dialog
      .getByRole('combobox', { name: /^Decisão/ })
      .selectOption(decisao);
    await dialog.getByRole('button', { name: 'Confirmar decisão' }).click();
    await expect(
      dialog.getByText('Informe o motivo da decisão.'),
    ).toBeVisible();
    expect(pedidos).toHaveLength(0);
    if (process.env.E2E_CAPTURAS_FE23 && decisao === 'aprovar') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .locator('html')
        .evaluate((element) => element.setAttribute('data-theme', 'dark'));
      await dialog.evaluate((element) => element.scrollTo(0, 0));
      await page.screenshot({
        path: 'docs/capturas/fe23-analise-mobile-escuro.png',
        fullPage: true,
      });
      expect(await excessoHorizontal(page)).toBeLessThanOrEqual(1);
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    await dialog.getByLabel('Motivo da decisão').fill('  Motivo da análise  ');
    await dialog.getByRole('button', { name: 'Confirmar decisão' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByLabel('1 proposta pendente')).toBeVisible();
    await expect(tabela.getByText('Oferta atrasada')).toHaveCount(0);
    expect(pedidos).toEqual([{ motivo: 'Motivo da análise' }]);
    await expect(
      page.getByRole('region', { name: 'Lista de pendências' }),
    ).toBeFocused();
  });
}

test('Comercial recebe 403 na fila de pendências', async ({ page }) => {
  await entrar(page, 'comercial@exemplo.com');
  await expect(
    page.getByRole('link', { name: 'Pendências', exact: true }),
  ).toHaveCount(0);
  const resposta = await page.goto('/propostas/pendencias');
  expect(resposta?.status()).toBe(403);
  await expect(
    page.getByRole('heading', { name: 'Acesso negado' }),
  ).toBeVisible();
});
