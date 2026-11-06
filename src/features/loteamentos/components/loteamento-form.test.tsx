import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeLoteamento } from '@/test/factories/loteamento.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import { ToastProvider } from '@/shared/ui/toast';
import { EditarLoteamentoForm, NovoLoteamentoForm } from './loteamento-form';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const ID = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';

function renderForm(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

function mockErro(
  method: 'post' | 'patch',
  status: number,
  code: string,
  message: string,
) {
  server.use(
    http.untyped[method]('*/v1/loteamentos*', () =>
      HttpResponse.json(
        makeErrorResponse({ statusCode: status, code, message }),
        {
          status,
        },
      ),
    ),
  );
}

beforeEach(() => {
  setTestUrl('/loteamentos/novo');
});

describe('NovoLoteamentoForm', () => {
  it('envia os campos vazios como null e vai ao detalhe', async () => {
    const corpos: unknown[] = [];
    server.use(
      http.post('/v1/loteamentos', async ({ request, response }) => {
        corpos.push(await request.json());
        return response(201).json(makeLoteamento({ id: ID }));
      }),
    );
    const user = userEvent.setup();
    renderForm(<NovoLoteamentoForm />);

    await user.type(screen.getByLabelText(/Nome/), '  Bela Vista  ');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(window.location.pathname).toBe(`/loteamentos/${ID}`),
    );
    expect(corpos).toEqual([
      { nome: 'Bela Vista', descricao: null, localizacao: null },
    ]);
    expect(
      await screen.findByText('Loteamento cadastrado'),
    ).toBeInTheDocument();
  });

  it('valida antes de chamar a API', async () => {
    const chamada = vi.fn<() => void>();
    server.use(
      http.untyped.post('*/v1/loteamentos', () => {
        chamada();
        return HttpResponse.json({});
      }),
    );
    const user = userEvent.setup();
    renderForm(<NovoLoteamentoForm />);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
    expect(chamada).not.toHaveBeenCalled();
  });

  it('mostra o nome repetido embaixo do campo e continua na tela', async () => {
    mockErro(
      'post',
      409,
      'LOTEAMENTO_JA_EXISTE',
      'Já existe um loteamento com esse nome',
    );
    const user = userEvent.setup();
    renderForm(<NovoLoteamentoForm />);

    await user.type(screen.getByLabelText(/Nome/), 'Bela Vista');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(screen.getByLabelText(/Nome/)).toHaveAccessibleDescription(
        'Já existe um loteamento com esse nome',
      ),
    );
    expect(window.location.pathname).toBe('/loteamentos/novo');
  });

  it('mostra um 403 da API, mesmo com a tela liberada', async () => {
    mockErro('post', 403, 'ACESSO_NEGADO', 'Forbidden resource');
    const user = userEvent.setup();
    renderForm(<NovoLoteamentoForm />);

    await user.type(screen.getByLabelText(/Nome/), 'Bela Vista');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para executar esta ação.',
    );
  });
});

describe('EditarLoteamentoForm', () => {
  const LOTEAMENTO = makeLoteamento({
    id: ID,
    nome: 'Bela Vista',
    descricao: 'Residencial',
    localizacao: 'Toledo - PR',
  });

  it('preenche os campos, limpa o opcional com null e volta ao detalhe', async () => {
    setTestUrl(`/loteamentos/${ID}/editar`);
    const corpos: unknown[] = [];
    server.use(
      http.patch('/v1/loteamentos/{id}', async ({ request, response }) => {
        corpos.push(await request.json());
        return response(200).json(LOTEAMENTO);
      }),
    );
    const user = userEvent.setup();
    renderForm(<EditarLoteamentoForm loteamento={LOTEAMENTO} />);

    expect(screen.getByLabelText(/Nome/)).toHaveValue('Bela Vista');
    expect(screen.getByLabelText('Descrição')).toHaveValue('Residencial');
    await user.clear(screen.getByLabelText('Localização'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(window.location.pathname).toBe(`/loteamentos/${ID}`),
    );
    expect(corpos).toEqual([
      { nome: 'Bela Vista', descricao: 'Residencial', localizacao: null },
    ]);
  });

  it('aceita campos nulos e oferece cancelar', () => {
    renderForm(
      <EditarLoteamentoForm loteamento={makeLoteamento({ id: ID })} />,
    );

    expect(screen.getByLabelText('Descrição')).toHaveValue('');
    expect(screen.getByLabelText('Localização')).toHaveValue('');
    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute(
      'href',
      `/loteamentos/${ID}`,
    );
  });
});
