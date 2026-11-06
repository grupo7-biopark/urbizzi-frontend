'use client';

import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { IconRemover } from '@/shared/ui/icon';
import type { Lote } from '../api/lotes.api';
import { useDeleteLote } from '../hooks/use-delete-lote';

/** A regra é da API: fora dela, a confirmação continua aberta e mostra o motivo. */
export function RemoverLote({ lote }: { lote: Pick<Lote, 'id' | 'numero'> }) {
  const remover = useDeleteLote();

  return (
    <ConfirmDialog
      title={`Remover o lote ${lote.numero}?`}
      description="Só um lote disponível e sem histórico de reservas pode ser removido."
      confirmLabel="Remover lote"
      onConfirm={() => remover.mutateAsync(lote.id)}
      trigger={
        <Button
          variant="perigoSutil"
          size="compacto"
          aria-label={`Remover o lote ${lote.numero}`}
        >
          <IconRemover className="size-4" />
          Remover
        </Button>
      }
    />
  );
}
