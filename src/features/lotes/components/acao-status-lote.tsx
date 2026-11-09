'use client';

import type { QueryKey } from '@tanstack/react-query';
import { Permitido } from '@/shared/auth/permitido';
import type { Acao } from '@/shared/auth/permissoes';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { alterarStatusLote, type AcaoStatusLote } from '../api/lotes-acoes.api';
import { lotesKeys } from '../api/lotes.queries';

const ACOES: Record<
  AcaoStatusLote,
  { label: string; permissao: Acao; descricao: string; sucesso: string }
> = {
  bloquear: {
    label: 'Bloquear lote',
    permissao: 'bloquearLote',
    descricao:
      'O lote ficará indisponível para reservas. Informe uma justificativa administrativa, sem dados pessoais.',
    sucesso: 'Lote bloqueado',
  },
  desbloquear: {
    label: 'Desbloquear lote',
    permissao: 'bloquearLote',
    descricao: 'O lote voltará a ficar Disponível para reservas.',
    sucesso: 'Lote desbloqueado',
  },
  vender: {
    label: 'Marcar como Vendido',
    permissao: 'marcarVendido',
    descricao:
      'Confirme a venda do lote. A API confere a reserva ativa e a proposta aprovada.',
    sucesso: 'Lote marcado como Vendido',
  },
};

export function AcaoStatusLote({
  loteId,
  numeroLote,
  acao,
  invalidates,
}: {
  loteId: string;
  numeroLote: string;
  acao: AcaoStatusLote;
  invalidates: QueryKey[];
}) {
  const config = ACOES[acao];
  const mutation = useApiMutation({
    mutationFn: alterarStatusLote,
    invalidates: [lotesKeys.all, ...invalidates],
    successMessage: config.sucesso,
    errorToast: false,
  });
  return (
    <Permitido acao={config.permissao}>
      <ConfirmDialog
        title={`${config.label}: lote ${numeroLote}?`}
        description={config.descricao}
        confirmLabel={config.label}
        motivo={acao === 'bloquear' ? { required: true } : undefined}
        trigger={<Button variant="secundario">{config.label}</Button>}
        onConfirm={(motivo) =>
          mutation.mutateAsync({ id: loteId, acao, motivo })
        }
      />
    </Permitido>
  );
}
