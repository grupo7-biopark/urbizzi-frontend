import type { Page, Locator } from '@playwright/test';
import type { components } from '../src/shared/api/schema';
import { api, como, reservar, expect, test } from './support/reservas.fixture';
test.skip(
  !process.env.E2E_API_URL || !process.env.E2E_BACKEND_DIR,
  'Requer backend real e banco isolado de teste.',
);
async function temCorNoMapa(page: Page, token: string) {
  return page.locator('.leaflet-overlay-pane canvas').evaluateAll(
    (elementos, variavel) =>
      elementos.some((elemento) => {
        if (!(elemento instanceof HTMLCanvasElement)) return false;
        const contexto = elemento.getContext('2d');
        if (!contexto || !elemento.width || !elemento.height) return false;
        const amostra = document.createElement('canvas');
        amostra.width = 1;
        amostra.height = 1;
        const pincel = amostra.getContext('2d');
        if (!pincel) return false;
        const resolvedor = document.createElement('span');
        resolvedor.style.color = 'var(' + variavel + ')';
        elemento.parentElement?.append(resolvedor);
        pincel.fillStyle = getComputedStyle(resolvedor).color;
        resolvedor.remove();
        pincel.fillRect(0, 0, 1, 1);
        const cor = pincel.getImageData(0, 0, 1, 1).data;
        const pixels = contexto.getImageData(
          0,
          0,
          elemento.width,
          elemento.height,
        ).data;
        for (let posicao = 0; posicao < pixels.length; posicao += 4) {
          if (
            pixels[posicao + 3] > 0 &&
            Math.abs(pixels[posicao] - cor[0]) <= 2 &&
            Math.abs(pixels[posicao + 1] - cor[1]) <= 2 &&
            Math.abs(pixels[posicao + 2] - cor[2]) <= 2
          )
            return true;
        }
        return false;
      }),
    token,
  );
}

async function abrirMarcador(
  page: Page,
  loteamentoId: string,
): Promise<Locator> {
  await page.goto(`/mapa?loteamentoId=${loteamentoId}`);
  await page.getByLabel('Buscar lote por número').fill('12');
  await page.getByRole('button', { name: /^Lote 12, quadra/ }).click();
  await page.getByRole('button', { name: 'Ver dados do lote' }).click();
  const painel = page.getByRole('dialog');
  await expect(painel.getByText('Disponível', { exact: true })).toBeVisible();
  return painel;
}

test('reserva pelo mapa e envia proposta usando o backend real', async ({
  browser,
  request,
  cenario,
  scenario,
}, testInfo) => {
  await api(request, 'POST', `/plantas/${scenario.plantaId}/marcadores`, {
    loteId: cenario.lote.id,
    x: 0.5,
    y: 0.5,
  });
  const comercial = await como(browser, 'comercial', testInfo);
  const page = comercial.page;
  try {
    await abrirMarcador(page, cenario.lote.loteamentoId);
    await expect
      .poll(() => temCorNoMapa(page, '--status-disponivel'))
      .toBe(true);
    await reservar(page, cenario.cliente.nome);
    await expect(
      page.getByRole('dialog').getByText('Reservado', { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => temCorNoMapa(page, '--status-reservado'))
      .toBe(true);
    await expect
      .poll(() => temCorNoMapa(page, '--status-disponivel'))
      .toBe(false);
    await page
      .getByRole('button', { name: 'Criar proposta', exact: true })
      .click();
    const proposta = page.getByRole('dialog');
    await proposta.getByLabel('Valor proposto').fill('20000000');
    await proposta
      .getByLabel('Condições de pagamento')
      .fill('Pagamento à vista fictício');
    await proposta.getByRole('button', { name: 'Enviar proposta' }).click();
    await expect(
      page.getByText('Proposta enviada para análise', { exact: true }),
    ).toBeVisible();
    const detalhe = await api<components['schemas']['LoteDetalheDto']>(
      request,
      'GET',
      `/lotes/${cenario.lote.id}/detalhe`,
    );
    expect(detalhe.propostas[0]?.status).toBe('EM_ANALISE');
    expect(detalhe.reserva?.vendedor.id).toBe(scenario.accounts.comercial.id);
  } finally {
    await comercial.context.close();
  }
});
test('gestor bloqueia e desbloqueia o lote pelo mapa', async ({
  page,
  request,
  cenario,
  scenario,
}) => {
  await api(request, 'POST', `/plantas/${scenario.plantaId}/marcadores`, {
    loteId: cenario.lote.id,
    x: 0.6,
    y: 0.5,
  });
  await abrirMarcador(page, cenario.lote.loteamentoId);
  await page
    .getByRole('button', { name: 'Bloquear lote', exact: true })
    .click();
  const bloquear = page.getByRole('dialog');
  await bloquear
    .getByRole('textbox', { name: /Motivo/ })
    .fill('Conferência administrativa fictícia');
  await bloquear
    .getByRole('button', { name: 'Bloquear lote', exact: true })
    .click();
  await expect(
    page.getByRole('dialog').getByText('Bloqueado', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Desbloquear lote', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Desbloquear lote', exact: true })
    .click();
  await expect(
    page.getByRole('dialog').getByText('Disponível', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
});
