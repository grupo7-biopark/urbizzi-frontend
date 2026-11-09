'use client';

import { useQueryClient } from '@tanstack/react-query';
import { clientesKeys } from '@/features/clientes/api/clientes.queries';
import { BuscaCliente } from '@/features/clientes/components/busca-cliente';
import { CadastroRapidoCliente } from '@/features/clientes/components/cliente-form';
import {
  loteDetalheCompletoOptions,
  lotesKeys,
} from '@/features/lotes/api/lotes.queries';
import { mapaKeys } from '@/features/mapa/api/mapa.queries';
import { reservasKeys } from '@/features/reservas/api/reservas.queries';
import { ReservarLote } from '@/features/reservas/components/reservar-lote';

export function AcaoReserva({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const detalhe = loteDetalheCompletoOptions(id);

  return (
    <ReservarLote
      loteId={id}
      Busca={BuscaCliente}
      Cadastro={CadastroRapidoCliente}
      invalidates={[
        lotesKeys.detail(id),
        lotesKeys.lists(),
        clientesKeys.historicos(),
        mapaKeys.all,
        reservasKeys.all,
      ]}
      aoReservar={async () => {
        await queryClient.cancelQueries({ queryKey: detalhe.queryKey });
        queryClient.setQueryData(detalhe.queryKey, (atual) =>
          atual
            ? {
                ...atual,
                lote: { ...atual.lote, status: 'RESERVADO' as const },
              }
            : atual,
        );
      }}
    />
  );
}
