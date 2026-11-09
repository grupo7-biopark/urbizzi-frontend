'use client';

import { useQuery } from '@tanstack/react-query';
import { clientesKeys } from '@/features/clientes/api/clientes.queries';
import {
  loteDetalheCompletoOptions,
  lotesKeys,
} from '@/features/lotes/api/lotes.queries';
import { mapaKeys } from '@/features/mapa/api/mapa.queries';
import { CriarProposta } from '@/features/propostas/components/criar-proposta';

const INVALIDATES = [lotesKeys.all, mapaKeys.all, clientesKeys.historicos()];

export function AcaoProposta({ id }: { id: string }) {
  const query = useQuery(loteDetalheCompletoOptions(id));
  const reserva = query.data?.reserva;
  if (!query.data || !reserva) return null;
  const emAndamento = query.data.propostas.some(
    (proposta) =>
      proposta.status === 'EM_ANALISE' || proposta.status === 'APROVADA',
  );
  return (
    <CriarProposta
      reservaId={reserva.id}
      vendedorId={reserva.vendedor.id}
      numeroLote={query.data.lote.numero}
      vencimentoReserva={reserva.dataVencimento}
      disponivel={reserva.status === 'ATIVA' && !emAndamento}
      invalidates={INVALIDATES}
    />
  );
}
