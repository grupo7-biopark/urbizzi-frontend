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
  motivo?: { label?: string; required?: boolean };
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
  onConfirm,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [isPending, setIsPending] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const value = text.trim();
  const isMissingMotivo = Boolean(motivo?.required) && value === '';

  function handleOpenChange(next: boolean) {
    setInternalOpen(next);
    onOpenChange?.(next);

    // Um novo diálogo não herda o motivo nem o erro da tentativa anterior.
    if (!next) {
      setText('');
      setError(null);
    }
  }

  async function handleConfirm() {
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
      onOpenChange={handleOpenChange}
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
            disabled={isMissingMotivo}
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
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      ) : null}
      {error ? <Alert>{getErrorMessage(error)}</Alert> : null}
    </Dialog>
  );
}
