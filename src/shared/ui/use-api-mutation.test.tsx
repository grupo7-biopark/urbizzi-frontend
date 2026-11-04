import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  apiErrorFromNetworkFailure,
  apiErrorFromResponse,
} from '@/shared/api/errors';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { ToastProvider } from './toast';
import { useApiMutation } from './use-api-mutation';

afterEach(() => {
  vi.restoreAllMocks();
});

const LISTA = ['lotes', 'list'];
const DETALHE = ['lotes', 'detail', '1'];

type Options = Partial<Parameters<typeof useApiMutation<{ id: string }>>[0]> & {
  mutationFn: () => Promise<{ id: string }>;
};

function Exemplo(options: Options) {
  const mutation = useApiMutation({
    invalidates: [LISTA],
    successMessage: 'Lote salvo',
    ...options,
  });

  return (
    <button
      type="button"
      onClick={() => mutation.mutate(undefined, { onError: () => undefined })}
    >
      Salvar
    </button>
  );
}

function setup(options: Options) {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Exemplo {...options} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { invalidate, user: userEvent.setup() };
}

function erro(status: number, code: string, message = 'Mensagem da API') {
  return apiErrorFromResponse(
    status,
    makeErrorResponse({ statusCode: status, code, message }),
  );
}

async function salvar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Salvar' }));
}

describe('useApiMutation', () => {
  it('no sucesso, invalida as queries e mostra o Toast', async () => {
    const { invalidate, user } = setup({
      mutationFn: () => Promise.resolve({ id: '1' }),
      invalidates: [LISTA, DETALHE],
    });

    await salvar(user);

    expect(await screen.findByText('Lote salvo')).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LISTA });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DETALHE });
  });

  it('calcula as queries a partir da resposta', async () => {
    const { invalidate, user } = setup({
      mutationFn: () => Promise.resolve({ id: '7' }),
      invalidates: (data) => [['lotes', 'detail', data.id]],
    });

    await salvar(user);

    await screen.findByText('Lote salvo');
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['lotes', 'detail', '7'],
    });
  });

  it('no erro, mostra a mensagem em um Toast, sem invalidar', async () => {
    const { invalidate, user } = setup({
      mutationFn: () => Promise.reject(erro(422, 'REGRA', 'Regra violada')),
    });

    await salvar(user);

    expect(await screen.findByText('Regra violada')).toBeInTheDocument();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('em conflito, invalida também: a tela mostra um estado que já mudou', async () => {
    const { invalidate, user } = setup({
      mutationFn: () => Promise.reject(erro(409, 'LOTE_NAO_DISPONIVEL')),
    });

    await salvar(user);

    expect(
      await screen.findByText('Este lote não está mais disponível.'),
    ).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LISTA });
  });

  it('em conflito, não invalida quando as queries dependem da resposta', async () => {
    const { invalidate, user } = setup({
      mutationFn: () => Promise.reject(erro(409, 'CONFLITO')),
      invalidates: () => [LISTA],
    });

    await salvar(user);

    await screen.findByText(/Os dados mudaram/);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('avisa a falha de rede', async () => {
    const { user } = setup({
      mutationFn: () => Promise.reject(apiErrorFromNetworkFailure()),
    });

    await salvar(user);

    expect(
      await screen.findByText(/Não foi possível conectar ao servidor/),
    ).toBeInTheDocument();
  });

  it('dentro de um Form, não duplica o erro em um Toast', async () => {
    const mutationFn = vi.fn<() => Promise<{ id: string }>>(() =>
      Promise.reject(erro(422, 'REGRA', 'Regra violada')),
    );
    const { user } = setup({ mutationFn, errorToast: false });

    await salvar(user);

    await waitFor(() => expect(mutationFn).toHaveBeenCalled());
    expect(screen.queryByText('Regra violada')).not.toBeInTheDocument();
  });

  it('não avisa a sessão perdida, que já leva ao login', async () => {
    const mutationFn = vi.fn<() => Promise<{ id: string }>>(() =>
      Promise.reject(erro(401, 'NAO_AUTENTICADO')),
    );
    const { user } = setup({ mutationFn });

    await salvar(user);

    await waitFor(() => expect(mutationFn).toHaveBeenCalled());
    expect(screen.queryByText(/Sua sessão expirou/)).not.toBeInTheDocument();
  });
});
