'use client';

import { Button, type ButtonSize } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { IconRemover } from '@/shared/ui/icon';
import type { Loteamento } from '../api/loteamentos.api';
import { useDeleteLoteamento } from '../hooks/use-delete-loteamento';

type RemoverLoteamentoProps = {
  loteamento: Pick<Loteamento, 'id' | 'nome'>;
  onRemoved?: () => void;
  size?: ButtonSize;
};

/** Com quadras vinculadas, a API recusa, e o diálogo mostra o motivo. */
export function RemoverLoteamento({
  loteamento,
  onRemoved,
  size,
}: RemoverLoteamentoProps) {
  const remover = useDeleteLoteamento();

  return (
    <ConfirmDialog
      title={`Remover o loteamento ${loteamento.nome}?`}
      description="Um loteamento com quadras cadastradas não pode ser removido."
      confirmLabel="Remover loteamento"
      onConfirm={async () => {
        await remover.mutateAsync(loteamento.id);
        onRemoved?.();
      }}
      trigger={
        <Button
          variant="perigoSutil"
          size={size}
          aria-label={`Remover ${loteamento.nome}`}
        >
          <IconRemover className="size-4" />
          Remover
        </Button>
      }
    />
  );
}
