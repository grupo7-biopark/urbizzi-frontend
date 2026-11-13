import type { components } from '../src/shared/api/schema';
import { api, como, expect, test } from './support/reservas.fixture';

test.skip(
  !process.env.E2E_API_URL || !process.env.E2E_BACKEND_DIR,
  'Requer backend real e banco isolado.',
);

for (const decisao of ['aprovar', 'rejeitar'] as const) {
  test(`gestor registra ${decisao} no backend e o lote permanece reservado`, async ({
    page,
    browser,
    request,
    cenario,
  }, testInfo) => {
    const comercial = await como(browser, 'comercial', testInfo);
    try {
      const reserva = await api<components['schemas']['ReservaDto']>(
        comercial.context.request,
        'POST',
        '/reservas',
        { loteId: cenario.lote.id, clienteId: cenario.cliente.id },
      );
      const proposta = await api<components['schemas']['PropostaDto']>(
        comercial.context.request,
        'POST',
        `/reservas/${reserva.id}/propostas`,
        {
          valor: '234567.89',
          condicoes: `Oferta para ${decisao} ${cenario.lote.id}`,
        },
      );
      await page.goto('/propostas/pendencias');
      const linha = page
        .getByRole('row')
        .filter({ hasText: proposta.condicoes });
      await linha.getByRole('button', { name: 'Analisar proposta' }).click();
      const dialog = page.getByRole('dialog');
      await expect(
        dialog.getByRole('link', { name: cenario.cliente.nome }),
      ).toBeVisible();
      await dialog
        .getByRole('combobox', { name: /^Decisão/ })
        .selectOption(decisao);
      await dialog
        .getByLabel('Motivo da decisão')
        .fill('Análise registrada pelo E2E');
      await dialog.getByRole('button', { name: 'Confirmar decisão' }).click();
      await expect(dialog).not.toBeVisible();
      await expect(linha).toHaveCount(0);
      const atual = await api<components['schemas']['PropostaDto']>(
        request,
        'GET',
        `/propostas/${proposta.id}`,
      );
      expect(atual.status).toBe(
        decisao === 'aprovar' ? 'APROVADA' : 'REJEITADA',
      );
      expect(atual.motivoDecisao).toBe('Análise registrada pelo E2E');
      expect(atual.decididoPorId).toBeTruthy();
      expect(atual.dataDecisao).toBeTruthy();
      const lote = await api<components['schemas']['LoteDto']>(
        request,
        'GET',
        `/lotes/${cenario.lote.id}`,
      );
      expect(lote.status).toBe('RESERVADO');
    } finally {
      await comercial.context.close();
    }
  });
}

test('Comercial não entra na tela nem consulta a fila no backend', async ({
  browser,
}, testInfo) => {
  const comercial = await como(browser, 'comercial', testInfo);
  try {
    const resposta = await comercial.page.goto('/propostas/pendencias');
    expect(resposta?.status()).toBe(403);
    const apiResposta = await comercial.context.request.get(
      '/api/backend/v1/propostas/pendentes',
    );
    expect(apiResposta.status()).toBe(403);
  } finally {
    await comercial.context.close();
  }
});
