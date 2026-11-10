'use client';

import type { QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '@/shared/api/errors';
import { Permitido } from '@/shared/auth/permitido';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import type { Reserva } from '../api/reservas-acoes.api';
import { useCancelarReserva } from '../hooks/use-acoes-reserva';

export function CancelarReserva({
  reserva,
  numeroLote,
  temProposta,
  invalidates,
}: {
  reserva: Pick<Reserva, 'id' | 'status' | 'vendedorId'>;
  numeroLote: string;
  temProposta: boolean;
  invalidates: QueryKey[];
}) {
  const cancelar = useCancelarReserva(invalidates);
  const [exigeConfirmacao, setExigeConfirmacao] = useState(false);
  const encerrarPropostas = temProposta || exigeConfirmacao;
  if (reserva.status !== 'ATIVA') return null;

  return (
    <Permitido acao="gerenciarReservas" donoId={reserva.vendedorId}>
      <ConfirmDialog
        title={`Cancelar a reserva do lote ${numeroLote}?`}
        description={
          encerrarPropostas
            ? 'Há proposta em análise ou aprovada. O cancelamento encerra essas propostas, preservando as decisões anteriores, e devolve o lote para Disponível.'
            : 'O lote voltará a ficar Disponível. Informe o motivo do cancelamento.'
        }
        confirmLabel={
          encerrarPropostas
            ? 'Cancelar e encerrar propostas'
            : 'Cancelar reserva'
        }
        motivo={{ required: true, maxLength: 500 }}
        trigger={<Button variant="perigoSutil">Cancelar reserva</Button>}
        onOpenChange={(open) => {
          if (!open) setExigeConfirmacao(false);
        }}
        onConfirm={async (motivo) => {
          try {
            await cancelar.mutateAsync({
              id: reserva.id,
              body: { motivo, confirmar: encerrarPropostas },
            });
          } catch (cause) {
            if (
              cause instanceof ApiError &&
              cause.code === 'CONFIRMACAO_CANCELAMENTO_NECESSARIA'
            )
              setExigeConfirmacao(true);
            throw cause;
          }
        }}
      />
    </Permitido>
  );
}
