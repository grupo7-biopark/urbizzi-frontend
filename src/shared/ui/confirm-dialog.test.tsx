import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { apiErrorFromResponse } from '@/shared/api/errors';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { Button } from './button';
import { ConfirmDialog } from './confirm-dialog';

type OnConfirm = (motivo: string) => Promise<unknown> | void;

function setup({
  onConfirm = vi.fn<OnConfirm>(),
  required,
  semMotivo,
}: {
  onConfirm?: OnConfirm;
  required?: boolean;
  semMotivo?: boolean;
} = {}) {
  render(
    <ConfirmDialog
      title="Cancelar a reserva do lote 12?"
      description="Essa ação não pode ser desfeita."
      confirmLabel="Cancelar reserva"
      motivo={semMotivo ? undefined : { required }}
      onConfirm={onConfirm}
      trigger={<Button>Abrir</Button>}
    />,
  );
  return { onConfirm, user: userEvent.setup() };
}

const confirmar = () =>
  screen.getByRole('button', { name: 'Cancelar reserva' });

describe('ConfirmDialog', () => {
  it('diz a ação e o alvo, sem o motivo quando não é pedido', async () => {
    const { user, onConfirm } = setup({ semMotivo: true });

    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(
      screen.getByRole('dialog', { name: 'Cancelar a reserva do lote 12?' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Motivo/)).not.toBeInTheDocument();

    await user.click(confirmar());

    expect(onConfirm).toHaveBeenCalledWith('');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('com motivo obrigatório, só confirma depois de preenchido', async () => {
    const { user, onConfirm } = setup({ required: true });

    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(confirmar()).toBeDisabled();

    await user.type(screen.getByLabelText(/Motivo/), '   ');
    expect(confirmar()).toBeDisabled();

    await user.type(screen.getByLabelText(/Motivo/), ' desistiu ');
    expect(confirmar()).toBeEnabled();

    await user.click(confirmar());

    expect(onConfirm).toHaveBeenCalledWith('desistiu');
  });

  it('com motivo opcional, permite confirmar em branco', async () => {
    const { user } = setup({ required: false });

    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(confirmar()).toBeEnabled();
  });

  it('ao falhar, continua aberto com a mensagem e o motivo', async () => {
    const onConfirm = vi.fn<OnConfirm>(() =>
      Promise.reject(
        apiErrorFromResponse(
          422,
          makeErrorResponse({
            statusCode: 422,
            code: 'RESERVA_NAO_RENOVAVEL',
            message: 'Só é possível renovar reservas ativas',
          }),
        ),
      ),
    );
    const { user } = setup({ onConfirm, required: true });

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.type(screen.getByLabelText(/Motivo/), 'desistiu');
    await user.click(confirmar());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Só é possível renovar reservas ativas',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo/)).toHaveValue('desistiu');
    expect(confirmar()).toBeEnabled();
  });

  it('desativa os botões durante a confirmação', async () => {
    let concluir: () => void = () => undefined;
    const onConfirm = vi.fn<OnConfirm>(
      () =>
        new Promise<void>((resolve) => {
          concluir = resolve;
        }),
    );
    const { user } = setup({ onConfirm, semMotivo: true });

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(confirmar());

    expect(confirmar()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();

    concluir();

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('ao reabrir, não herda o motivo nem o erro anterior', async () => {
    const onConfirm = vi.fn<OnConfirm>(() =>
      Promise.reject(new Error('falhou')),
    );
    const { user } = setup({ onConfirm, required: true });

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.type(screen.getByLabelText(/Motivo/), 'desistiu');
    await user.click(confirmar());
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.getByLabelText(/Motivo/)).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('pode ser controlado de fora', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        title="Bloquear o lote?"
        confirmLabel="Bloquear"
        onConfirm={() => undefined}
        open
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Bloquear' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
