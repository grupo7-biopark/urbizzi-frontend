import type { components } from '../src/shared/api/schema';
import type { Paginated } from '../src/shared/api/pagination';
import { api, como, reservar, expect, test } from './support/reservas.fixture';
test.skip(
  !process.env.E2E_API_URL || !process.env.E2E_BACKEND_DIR,
  'Requer backend real e banco isolado de teste.',
);

test('a lupa permanece centralizada no campo de cliente com a lista aberta', async ({
  page,
  cenario,
}) => {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/lotes/${cenario.lote.id}`);
    await page.getByRole('button', { name: 'Reservar', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Reservar lote' });
    const campo = dialog.getByRole('combobox', { name: /^Cliente/ });
    await campo.click();
    await expect(
      dialog.getByRole('option', { name: 'Cadastrar novo cliente' }),
    ).toBeVisible();
    const inputBox = await campo.boundingBox();
    const iconBox = await campo.locator('..').locator('svg').boundingBox();
    expect(inputBox).not.toBeNull();
    expect(iconBox).not.toBeNull();
    expect(
      Math.abs(
        iconBox!.y + iconBox!.height / 2 - (inputBox!.y + inputBox!.height / 2),
      ),
    ).toBeLessThanOrEqual(1);
    expect(iconBox!.y + iconBox!.height).toBeLessThan(
      inputBox!.y + inputBox!.height,
    );
    await expect(campo).toHaveCSS('padding-inline-start', '40px');
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
});
test('reserva existente, renova, registra histórico e cancela com motivo', async ({
  page,
  cenario,
}) => {
  await page.goto(`/lotes/${cenario.lote.id}`);
  await reservar(page, cenario.cliente.nome);
  await expect(page.getByText('Reservado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Renovar', exact: true }).click();
  const renovacao = page.getByRole('dialog');
  await expect(renovacao.getByText(/Novo vencimento previsto/)).toBeVisible();
  await renovacao.getByRole('button', { name: 'Confirmar renovação' }).click();
  await expect(
    page.getByText('Reserva renovada', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Renovações da reserva' })
      .getByText('Reserva renovada'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Cancelar reserva', exact: true })
    .click();
  const cancelamento = page.getByRole('dialog');
  await expect(
    cancelamento.getByRole('button', { name: 'Cancelar reserva' }),
  ).toBeDisabled();
  await cancelamento
    .getByRole('textbox', { name: /Motivo/ })
    .fill('Desistência fictícia no teste E2E');
  await cancelamento.getByRole('button', { name: 'Cancelar reserva' }).click();
  await expect(page.getByText('Disponível', { exact: true })).toBeVisible();
});
test('outro comercial e Consulta não recebem ações de reserva', async ({
  browser,
  cenario,
}, testInfo) => {
  const comercial = await como(browser, 'comercial', testInfo);
  const outro = await como(browser, 'outro', testInfo);
  const consulta = await como(browser, 'consulta', testInfo);
  try {
    const reserva = await api<components['schemas']['ReservaDto']>(
      comercial.context.request,
      'POST',
      '/reservas',
      { loteId: cenario.lote.id, clienteId: cenario.cliente.id },
    );
    for (const pessoa of [outro, consulta]) {
      await pessoa.page.goto(`/lotes/${cenario.lote.id}`);
      await expect(
        pessoa.page.getByRole('heading', { name: 'Lote 12', exact: true }),
      ).toBeVisible();
      await expect(
        pessoa.page.getByRole('button', { name: 'Renovar', exact: true }),
      ).toHaveCount(0);
      await expect(
        pessoa.page.getByRole('button', {
          name: 'Cancelar reserva',
          exact: true,
        }),
      ).toHaveCount(0);
    }
    const bloqueada = await outro.context.request.post(
      `/api/backend/v1/reservas/${reserva.id}/renovar`,
    );
    expect(bloqueada.status()).toBe(403);
  } finally {
    await comercial.context.close();
    await outro.context.close();
    await consulta.context.close();
  }
});
test('cancelamento exige aviso extra e encerra a proposta em análise', async ({
  page,
  request,
  cenario,
}) => {
  const reserva = await api<components['schemas']['ReservaDto']>(
    request,
    'POST',
    '/reservas',
    { loteId: cenario.lote.id, clienteId: cenario.cliente.id },
  );
  await api(request, 'POST', `/reservas/${reserva.id}/propostas`, {
    valor: '200000.00',
    condicoes: 'Pagamento fictício à vista',
  });
  await page.goto(`/lotes/${cenario.lote.id}`);
  await page
    .getByRole('button', { name: 'Cancelar reserva', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByText(/Há proposta em análise ou aprovada/),
  ).toBeVisible();
  await dialog
    .getByRole('textbox', { name: /Motivo/ })
    .fill('Desistência fictícia com proposta');
  await dialog
    .getByRole('button', { name: 'Cancelar e encerrar propostas' })
    .click();
  await expect(page.getByText('Disponível', { exact: true })).toBeVisible();
  const propostas = await api<Paginated<components['schemas']['PropostaDto']>>(
    request,
    'GET',
    `/reservas/${reserva.id}/propostas`,
  );
  expect(propostas.data[0]).toMatchObject({
    status: 'EM_ANALISE',
    encerrada: true,
    motivoEncerramento: 'Desistência fictícia com proposta',
    atrasada: false,
    dataDecisao: null,
    motivoDecisao: null,
  });
  expect(propostas.data[0]?.dataEncerramento).toBeTruthy();
});
