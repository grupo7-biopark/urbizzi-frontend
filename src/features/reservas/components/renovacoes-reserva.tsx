'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getErrorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/button';
import { formatDataHora } from '@/shared/ui/datas';
import { ErrorState } from '@/shared/ui/empty-state';
import { LinhaDoTempo } from '@/shared/ui/linha-do-tempo';
import { Skeleton } from '@/shared/ui/skeleton';
import { renovacoesReservaOptions } from '../api/reservas-acoes.queries';

export function RenovacoesReserva({ reservaId }: { reservaId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery(renovacoesReservaOptions(reservaId, page));
  return (
    <section
      aria-label="Renovações da reserva"
      className="mt-5 flex flex-col gap-3 border-t border-border pt-4"
    >
      <h3 className="font-bold">Renovações</h3>
      {query.isPending ? (
        <Skeleton aria-label="Carregando renovações" className="h-20" />
      ) : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          action={
            <Button variant="secundario" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : null}
      {query.data ? (
        <>
          <LinhaDoTempo
            vazio="Esta reserva ainda não foi renovada."
            itens={query.data.data.map((item) => ({
              id: item.id,
              data: item.createdAt,
              titulo: 'Reserva renovada',
              detalhe: (
                <p>
                  De {formatDataHora(item.vencimentoAnterior)} para{' '}
                  {formatDataHora(item.vencimentoNovo)}.
                </p>
              ),
            }))}
          />
          {query.data.meta.totalPages > 1 ? (
            <nav
              aria-label="Páginas de renovações"
              className="flex flex-wrap items-center gap-2"
            >
              <Button
                variant="secundario"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span>
                Página {page} de {query.data.meta.totalPages}
              </span>
              <Button
                variant="secundario"
                disabled={page >= query.data.meta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </Button>
            </nav>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
