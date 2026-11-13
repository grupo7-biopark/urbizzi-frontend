import type { components } from '../src/shared/api/schema';
import { api, expect, test } from './support/reservas.fixture';

test.skip(!process.env.E2E_API_URL, 'Requer backend real e banco de teste.');

test('só vende com proposta aprovada e exige confirmação irreversível', async ({
  page,
  request,
  cenario,
}) => {
  const reserva = await api<components['schemas']['ReservaDto']>(
    request,
    'POST',
    '/reservas',
    {
      loteId: cenario.lote.id,
      clienteId: cenario.cliente.id,
    },
  );
  const proposta = await api<components['schemas']['PropostaDto']>(
    request,
    'POST',
    `/reservas/${reserva.id}/propostas`,
    {
      valor: '200000.00',
      condicoes: 'À vista, dados fictícios.',
    },
  );
  await page.goto(`/lotes/${cenario.lote.id}`);
  await expect(
    page.getByRole('heading', { name: 'Lote 12', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Marcar como Vendido' }),
  ).toHaveCount(0);
  await api(request, 'POST', `/propostas/${proposta.id}/aprovar`, {
    motivo: 'Aprovação fictícia para validar a venda.',
  });
  await page.reload();
  await page.getByRole('button', { name: 'Marcar como Vendido' }).click();
  const dialogo = page.getByRole('dialog');
  const confirmar = dialogo.getByRole('button', {
    name: 'Marcar como Vendido',
  });
  await expect(confirmar).toBeDisabled();
  await dialogo
    .getByRole('checkbox', { name: /não pode ser desfeita/ })
    .check();
  await confirmar.click();
  await expect(
    page.getByText('Vendido', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: /Marcar como Vendido|Bloquear lote|Desbloquear lote/,
    }),
  ).toHaveCount(0);
});

test('bloqueia com motivo e desbloqueia o lote no detalhe', async ({
  page,
  cenario,
}) => {
  await page.goto(`/lotes/${cenario.lote.id}`);
  await page
    .getByRole('button', { name: 'Bloquear lote', exact: true })
    .click();
  const dialogo = page.getByRole('dialog');
  const confirmar = dialogo.getByRole('button', {
    name: 'Bloquear lote',
    exact: true,
  });
  await expect(confirmar).toBeDisabled();
  await dialogo
    .getByRole('textbox', { name: /Motivo/ })
    .fill('Bloqueio fictício para conferir o fluxo.');
  await confirmar.click();
  await expect(
    page.getByText('Bloqueado', { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Desbloquear lote', exact: true })
    .click();
  await dialogo
    .getByRole('button', { name: 'Desbloquear lote', exact: true })
    .click();
  await expect(
    page.getByText('Disponível', { exact: true }).first(),
  ).toBeVisible();
});
