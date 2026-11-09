'use client';

import { lotesKeys } from '@/features/lotes/api/lotes.queries';
import { clientesKeys } from '@/features/clientes/api/clientes.queries';
import { mapaKeys } from '@/features/mapa/api/mapa.queries';
import { CriarProposta } from '@/features/propostas/components/criar-proposta';
import type { ReservaResumo } from '@/features/reservas/api/reservas-consulta.api';
import { RenovarReserva } from '@/features/reservas/components/renovar-reserva';
import { ReservasTable } from '@/features/reservas/components/reservas-table';
import type { ReservasSearch } from '@/features/reservas/schemas/reservas-search.schema';

const INVALIDATES = [lotesKeys.all, mapaKeys.all, clientesKeys.historicos()];

function AcoesDaReserva({ reserva }: { reserva: ReservaResumo }) {
  return (
    <>
      <RenovarReserva
        reserva={reserva}
        numeroLote={reserva.lote.numero}
        invalidates={INVALIDATES}
      />
      <CriarProposta
        reservaId={reserva.id}
        vendedorId={reserva.vendedorId}
        numeroLote={reserva.lote.numero}
        vencimentoReserva={reserva.dataVencimento}
        disponivel={
          reserva.status === 'ATIVA' &&
          (!reserva.propostaAtual ||
            reserva.propostaAtual.status === 'REJEITADA')
        }
        invalidates={INVALIDATES}
      />
    </>
  );
}

function renderAcoes(reserva: ReservaResumo) {
  return <AcoesDaReserva reserva={reserva} />;
}

export function ReservasComAcoes({
  search,
  verTodas,
}: {
  search: ReservasSearch;
  verTodas: boolean;
}) {
  return (
    <ReservasTable
      search={search}
      verTodas={verTodas}
      renderAcoes={renderAcoes}
    />
  );
}
