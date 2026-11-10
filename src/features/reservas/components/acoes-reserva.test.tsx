import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToastProvider } from '@/shared/ui/toast';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeUsuario } from '@/test/factories/usuario.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import type { Reserva } from '../api/reservas-acoes.api';
import { CancelarReserva } from './cancelar-reserva';
import { RenovarReserva } from './renovar-reserva';
import { RenovacoesReserva } from './renovacoes-reserva';

const ID = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';
const RESERVA: Reserva = {
  id: ID,
  loteId: ID,
  clienteId: ID,
  vendedorId: makeUsuario().id,
  status: 'ATIVA',
  dataInicio: '2099-11-01T12:00:00Z',
  dataVencimento: '2099-11-08T12:00:00Z',
  tempoRestanteSegundos: 604800,
};

function montar(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json(makeUsuario()),
    ),
    http.get('/v1/reservas/previsao', ({ response }) =>
      response(200).json({
        prazoDias: 11,
        dataVencimento: '2099-11-12T12:00:00Z',
      }),
    ),
  );
});

describe('ações da reserva', () => {
  it('mostra novo prazo antes da confirmação e renova', async () => {
    server.use(
      http.post('/v1/reservas/{id}/renovar', ({ response }) =>
        response(200).json({
          ...RESERVA,
          dataVencimento: '2099-11-19T12:00:00Z',
        }),
      ),
    );
    montar(
      <RenovarReserva reserva={RESERVA} numeroLote="12" invalidates={[]} />,
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^Renovar$/ }),
    );
    const dialog = screen.getByRole('dialog');
    expect(
      await within(dialog).findByText(/Novo vencimento previsto/),
    ).toHaveTextContent('19/11/2099');
    await expectNoA11yViolations(dialog);
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmar renovação' }),
    );
    expect(await screen.findByText('Reserva renovada')).toBeInTheDocument();
  });
  it('mostra limite de renovações e mantém o diálogo aberto', async () => {
    server.use(
      http.post('/v1/reservas/{id}/renovar', ({ response }) =>
        response(409).json(
          makeErrorResponse({
            statusCode: 409,
            code: 'LIMITE_RENOVACOES_ATINGIDO',
            message: 'Limite de renovações atingido',
          }),
        ),
      ),
    );
    montar(
      <RenovarReserva reserva={RESERVA} numeroLote="12" invalidates={[]} />,
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^Renovar$/ }),
    );
    await screen.findByText(/Novo vencimento previsto/);
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar renovação' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Limite de renovações',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('exige motivo e confirmação explícita para encerrar proposta', async () => {
    let body: unknown;
    server.use(
      http.post('/v1/reservas/{id}/cancelar', async ({ request, response }) => {
        body = await request.json();
        return response(200).json({ ...RESERVA, status: 'CANCELADA' });
      }),
    );
    const queryClient = montar(
      <CancelarReserva
        reserva={RESERVA}
        numeroLote="12"
        invalidates={[]}
        temProposta
      />,
    );
    const propostasKey = ['propostas', 'minhas', {}];
    queryClient.setQueryData(propostasKey, {
      data: [{ status: 'EM_ANALISE' }],
    });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar reserva' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(/Há proposta em análise ou aprovada/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/preservando as decisões anteriores/),
    ).toBeVisible();
    expect(
      within(dialog).queryByText(/como rejeitadas/),
    ).not.toBeInTheDocument();
    const confirmar = within(dialog).getByRole('button', {
      name: 'Cancelar e encerrar propostas',
    });
    expect(confirmar).toBeDisabled();
    expect(
      within(dialog).getByRole('textbox', { name: /Motivo/ }),
    ).toHaveAttribute('maxlength', '500');
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: /Motivo/ }),
      '  Cliente desistiu  ',
    );
    await expectNoA11yViolations(dialog);
    await userEvent.click(confirmar);
    expect(await screen.findByText('Reserva cancelada')).toBeInTheDocument();
    expect(body).toEqual({ motivo: 'Cliente desistiu', confirmar: true });
    expect(queryClient.getQueryState(propostasKey)?.isInvalidated).toBe(true);
  });
  it('pede nova confirmação se uma proposta surgiu depois da leitura', async () => {
    let chamadas = 0;
    server.use(
      http.post('/v1/reservas/{id}/cancelar', async ({ request, response }) => {
        chamadas++;
        if (chamadas === 1)
          return response(409).json(
            makeErrorResponse({
              statusCode: 409,
              code: 'CONFIRMACAO_CANCELAMENTO_NECESSARIA',
              message: 'Confirme o encerramento das propostas da reserva',
            }),
          );
        expect(await request.json()).toEqual({
          motivo: 'Desistência',
          confirmar: true,
        });
        return response(200).json({ ...RESERVA, status: 'CANCELADA' });
      }),
    );
    montar(
      <CancelarReserva
        reserva={RESERVA}
        numeroLote="12"
        invalidates={[]}
        temProposta={false}
      />,
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar reserva' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: /Motivo/ }),
      'Desistência',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar reserva' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirme');
    expect(chamadas).toBe(1);
    await userEvent.click(
      within(dialog).getByRole('button', {
        name: 'Cancelar e encerrar propostas',
      }),
    );
    expect(await screen.findByText('Reserva cancelada')).toBeInTheDocument();
    expect(chamadas).toBe(2);
  });
  it('outro vendedor não recebe ações e reserva vencida não oferece renovar', async () => {
    const queryClient = montar(
      <>
        <RenovarReserva
          reserva={{ ...RESERVA, vendedorId: ID }}
          numeroLote="12"
          invalidates={[]}
        />
        <CancelarReserva
          reserva={{ ...RESERVA, vendedorId: ID }}
          numeroLote="12"
          invalidates={[]}
          temProposta={false}
        />
      </>,
    );
    await waitFor(() =>
      expect(queryClient.getQueryData(['auth', 'me'])).toBeDefined(),
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('apresenta histórico do contrato gerado', async () => {
    server.use(
      http.get('/v1/reservas/{id}/renovacoes', ({ response }) =>
        response(200).json({
          data: [
            {
              id: ID,
              usuarioId: ID,
              vencimentoAnterior: RESERVA.dataVencimento,
              vencimentoNovo: '2099-11-19T12:00:00Z',
              createdAt: '2099-11-02T12:00:00Z',
            },
          ],
          meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        }),
      ),
    );
    montar(<RenovacoesReserva reservaId={ID} />);
    expect(await screen.findByText('Reserva renovada')).toBeInTheDocument();
    expect(screen.getByText(/19\/11\/2099/)).toBeInTheDocument();
  });
});
