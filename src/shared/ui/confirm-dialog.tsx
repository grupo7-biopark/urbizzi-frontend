'use client';

import { useState, type ReactElement } from 'react';
import { getErrorMessage } from '@/shared/api/errors';
import { Alert } from './alert';
import { Button } from './button';
import { Dialog } from './dialog';
import { Textarea } from './textarea';

type ConfirmDialogProps = {
  /** Diz a ação e o alvo: "Cancelar a reserva do lote 12?". */
  title: string;
  description?: string;
  /** Descreve a ação ("Cancelar reserva"), não "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Pede um motivo. Com `required`, confirmar fica inativo até ser preenchido. */
  motivo?: { label?: string; required?: boolean; maxLength?: number };
  confirmacao?: string;
  /** Ao rejeitar, o diálogo continua aberto, com a mensagem de erro. */
  onConfirm: (motivo: string) => Promise<unknown> | void;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Voltar',
  motivo,
  confirmacao,
  onConfirm,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [text, setText] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [isPending, setIsPending] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const value = text.trim();
  const isMissingMotivo = Boolean(motivo?.required) && value === '';
  const bloqueado = isMissingMotivo || Boolean(confirmacao && !confirmado);

  function handleOpenChange(next: boolean) {
    setInternalOpen(next);
    onOpenChange?.(next);

    // Um novo diálogo não herda o motivo nem o erro da tentativa anterior.
    if (!next) {
      setText('');
      setConfirmado(false);
      setError(null);
    }
  }

  async function handleConfirm() {
    if (bloqueado || isPending) return;
    setIsPending(true);
    setError(null);

    try {
      await onConfirm(value);
      handleOpenChange(false);
    } catch (cause) {
      setError(cause);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      title={title}
      description={description}
      trigger={trigger}
      open={open}
      onOpenChange={(next) => {
        if (!isPending) handleOpenChange(next);
      }}
      footer={
        <>
          <Button
            variant="secundario"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="perigo"
            loading={isPending}
            disabled={bloqueado}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {motivo ? (
        <Textarea
          label={motivo.label ?? 'Motivo'}
          required={motivo.required}
          maxLength={motivo.maxLength}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      ) : null}
      {confirmacao ? (
        <label className="flex items-start gap-3 text-small">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-accent"
            checked={confirmado}
            disabled={isPending}
            onChange={(event) => setConfirmado(event.target.checked)}
          />
          {confirmacao}
        </label>
      ) : null}
      {error ? <Alert>{getErrorMessage(error)}</Alert> : null}
    </Dialog>
  );
}
