'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { clientesKeys } from '@/features/clientes/api/clientes.queries';
import { LoteDetalhe } from '@/features/lotes/components/lote-detalhe';
import {
  loteDetalheCompletoOptions,
  lotesKeys,
} from '@/features/lotes/api/lotes.queries';
import { mapaKeys } from '@/features/mapa/api/mapa.queries';
import { CancelarReserva } from '@/features/reservas/components/cancelar-reserva';
import { RenovarReserva } from '@/features/reservas/components/renovar-reserva';
import { RenovacoesReserva } from '@/features/reservas/components/renovacoes-reserva';

const INVALIDATES = [lotesKeys.all, mapaKeys.all, clientesKeys.historicos()];

export function LoteComAcoesReserva({
  id,
  acaoReserva,
  children,
}: {
  id: string;
  acaoReserva?: ReactNode;
  children?: ReactNode;
}) {
  const detalhe = useQuery(loteDetalheCompletoOptions(id));
  const reserva = detalhe.data?.reserva;
  const dados = reserva
    ? {
        id: reserva.id,
        status: reserva.status,
        vendedorId: reserva.vendedor.id,
        dataVencimento: reserva.dataVencimento,
      }
    : undefined;
  return (
    <LoteDetalhe
      id={id}
      acaoReserva={acaoReserva}
      complementoReserva={
        reserva && dados && detalhe.data ? (
          <>
            {children}
            <div className="mt-4 flex flex-wrap gap-2">
              <RenovarReserva
                reserva={dados}
                numeroLote={detalhe.data.lote.numero}
                invalidates={INVALIDATES}
              />
              <CancelarReserva
                reserva={dados}
                numeroLote={detalhe.data.lote.numero}
                temProposta={detalhe.data.propostas.some(
                  (proposta) =>
                    proposta.status === 'EM_ANALISE' ||
                    proposta.status === 'APROVADA',
                )}
                invalidates={INVALIDATES}
              />
            </div>
            <RenovacoesReserva key={reserva.id} reservaId={reserva.id} />
          </>
        ) : undefined
      }
    />
  );
}
