import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToastProvider } from '@/shared/ui/toast';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeUsuario } from '@/test/factories/usuario.factory';
import { makeProposta } from '@/test/factories/proposta.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { CriarProposta } from './criar-proposta';

const ID = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';

beforeEach(() => {
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json(makeUsuario()),
    ),
  );
});

function montar(
  vendedorId = makeUsuario().id,
  disponivel = true,
  vencimentoReserva = '2099-11-30T12:00:00Z',
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CriarProposta
          reservaId={ID}
          vendedorId={vendedorId}
          numeroLote="12"
          vencimentoReserva={vencimentoReserva}
          disponivel={disponivel}
          invalidates={[]}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

async function preencher() {
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('button', { name: /^Criar proposta$/ }),
  );
  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText(/Valor proposto/), '123456');
  await user.type(
    within(dialog).getByLabelText(/Condições de pagamento/),
    '  À vista  ',
  );
  return { user, dialog };
}

describe('CriarProposta', () => {
  it('envia decimal sem arredondar, preserva a reserva e avisa o sucesso', async () => {
    let recebido: unknown;
    server.use(
      http.post(
        '/v1/reservas/{reservaId}/propostas',
        async ({ request, response }) => {
          recebido = await request.json();
          return response(201).json(
            makeProposta({
              reservaId: ID,
              valor: '1234.56',
              condicoes: 'À vista',
            }),
          );
        },
      ),
    );
    montar();
    const { user, dialog } = await preencher();
    await expectNoA11yViolations(dialog);
    await user.click(
      within(dialog).getByRole('button', { name: 'Enviar proposta' }),
    );
    expect(
      await screen.findByText('Proposta enviada para análise'),
    ).toBeInTheDocument();
    expect(recebido).toEqual({
      valor: '1234.56',
      condicoes: 'À vista',
      observacoes: null,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/Prazo limite de análise:/)).toBeInTheDocument();
  });
  it('valida valor e condições antes de chamar a API', async () => {
    montar();
    await userEvent.click(
      await screen.findByRole('button', { name: /^Criar proposta$/ }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Enviar proposta' }),
    );
    expect(
      await within(dialog).findByText('Informe as condições de pagamento'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Valor proposto/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
  it('mantém os dados e a mensagem de conflito no modal', async () => {
    server.use(
      http.post('/v1/reservas/{reservaId}/propostas', ({ response }) =>
        response(409).json(
          makeErrorResponse({
            statusCode: 409,
            code: 'PROPOSTA_JA_EXISTE',
            message: 'Já existe uma proposta em análise para esta reserva',
          }),
        ),
      ),
    );
    montar();
    const { user, dialog } = await preencher();
    await user.click(
      within(dialog).getByRole('button', { name: 'Enviar proposta' }),
    );
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Já existe uma proposta em análise',
    );
    expect(within(dialog).getByLabelText(/Condições de pagamento/)).toHaveValue(
      '  À vista  ',
    );
  });
  it('não oferece o formulário de uma reserva de outro Comercial', async () => {
    const queryClient = montar(ID);
    await waitFor(() =>
      expect(queryClient.getQueryData(['auth', 'me'])).toBeDefined(),
    );
    expect(
      screen.queryByRole('button', { name: 'Criar proposta' }),
    ).not.toBeInTheDocument();
  });
  it.each([
    {
      disponivel: false,
      vencimento: '2099-11-30T12:00:00Z',
      caso: 'com proposta em andamento',
    },
    { disponivel: true, vencimento: '2000-01-01T12:00:00Z', caso: 'vencida' },
  ])(
    'não oferece nova proposta na reserva $caso',
    async ({ disponivel, vencimento }) => {
      const queryClient = montar(makeUsuario().id, disponivel, vencimento);
      await waitFor(() =>
        expect(queryClient.getQueryData(['auth', 'me'])).toBeDefined(),
      );
      expect(
        screen.queryByRole('button', { name: 'Criar proposta' }),
      ).not.toBeInTheDocument();
    },
  );
});
