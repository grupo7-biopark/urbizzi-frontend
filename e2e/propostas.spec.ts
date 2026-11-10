import type { components } from '../src/shared/api/schema';
import { api, como, expect, test } from './support/reservas.fixture';

test.skip(
  !process.env.E2E_API_URL || !process.env.E2E_BACKEND_DIR,
  'Requer backend real e banco isolado de teste.',
);

test('comercial cria proposta, acompanha prazo e rejeição e pode reenviar', async ({
  browser,
  request,
  cenario,
}, testInfo) => {
  const comercial = await como(browser, 'comercial', testInfo);
  const outro = await como(browser, 'outro', testInfo);
  try {
    const reserva = await api<components['schemas']['ReservaDto']>(
      comercial.context.request,
      'POST',
      '/reservas',
      { loteId: cenario.lote.id, clienteId: cenario.cliente.id },
    );
    await comercial.page.goto(`/lotes/${cenario.lote.id}`);
    await comercial.page
      .getByRole('button', { name: 'Criar proposta', exact: true })
      .click();
    const dialog = comercial.page.getByRole('dialog');
    await dialog.getByLabel('Valor proposto').fill('20000000');
    await dialog
      .getByLabel('Condições de pagamento')
      .fill('À vista no teste de proposta');
    await dialog.getByLabel('Observações').fill('Observação fictícia');
    await dialog.getByRole('button', { name: 'Enviar proposta' }).click();
    await expect(
      comercial.page.getByText('Proposta enviada para análise', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      comercial.page.getByText(/Prazo limite de análise:/),
    ).toBeVisible();
    await expect(
      comercial.page.getByRole('button', {
        name: 'Criar proposta',
        exact: true,
      }),
    ).toHaveCount(0);
    const duplicada = await comercial.context.request.post(
      `/api/backend/v1/reservas/${reserva.id}/propostas`,
      { data: { valor: '210000.00', condicoes: 'Duplicada fictícia' } },
    );
    expect(duplicada.status()).toBe(409);
    const detalhe = await api<components['schemas']['LoteDetalheDto']>(
      request,
      'GET',
      `/lotes/${cenario.lote.id}/detalhe`,
    );
    const proposta = detalhe.propostas[0];
    expect(proposta?.status).toBe('EM_ANALISE');
    await comercial.page.goto('/propostas');
    await expect(
      comercial.page
        .getByRole('table', { name: 'Minhas propostas' })
        .getByText('À vista no teste de proposta'),
    ).toBeVisible();
    await outro.page.goto('/propostas');
    await expect(
      outro.page.getByText('À vista no teste de proposta'),
    ).toHaveCount(0);
    await api(request, 'POST', `/propostas/${proposta!.id}/rejeitar`, {
      motivo: 'Valor abaixo do mínimo no teste',
    });
    await comercial.page.reload();
    await expect(
      comercial.page.getByText('Valor abaixo do mínimo no teste'),
    ).toBeVisible();
    await expect(
      comercial.page.getByText('Rejeitada', { exact: true }),
    ).toBeVisible();
    await comercial.page.goto(`/lotes/${cenario.lote.id}`);
    await expect(
      comercial.page.getByRole('button', {
        name: 'Criar proposta',
        exact: true,
      }),
    ).toBeVisible();
    await comercial.page
      .getByRole('button', { name: 'Criar proposta', exact: true })
      .click();
    const nova = comercial.page.getByRole('dialog');
    await nova.getByLabel('Valor proposto').fill('22000000');
    await nova
      .getByLabel('Condições de pagamento')
      .fill('Nova oferta após rejeição');
    await nova.getByRole('button', { name: 'Enviar proposta' }).click();
    await expect(
      comercial.page.getByText('Proposta enviada para análise', {
        exact: true,
      }),
    ).toBeVisible();
    const atualizado = await api<components['schemas']['LoteDetalheDto']>(
      request,
      'GET',
      `/lotes/${cenario.lote.id}/detalhe`,
    );
    expect(
      atualizado.propostas.filter((item) => item.status === 'EM_ANALISE'),
    ).toHaveLength(1);
    expect(
      atualizado.propostas.some((item) => item.status === 'REJEITADA'),
    ).toBe(true);
  } finally {
    await comercial.context.close();
    await outro.context.close();
  }
});
