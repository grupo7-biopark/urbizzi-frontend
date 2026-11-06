'use client';

import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import type { Loteamento } from '../api/loteamentos.api';
import { useDeleteLoteamento } from '../hooks/use-delete-loteamento';

type RemoverLoteamentoProps = {
  loteamento: Pick<Loteamento, 'id' | 'nome'>;
  onRemoved?: () => void;
};

/** Com quadras vinculadas, a API recusa, e o diálogo mostra o motivo. */
export function RemoverLoteamento({
  loteamento,
  onRemoved,
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
        <Button variant="secundario" aria-label={`Remover ${loteamento.nome}`}>
          Remover
        </Button>
      }
    />
  );
}
