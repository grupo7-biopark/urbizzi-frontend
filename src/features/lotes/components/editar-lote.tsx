'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Button, buttonClasses } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/empty-state';
import { PageHeader } from '@/shared/ui/page-header';
import { Skeleton } from '@/shared/ui/skeleton';
import { loteDetailOptions } from '../api/lotes.queries';
import { EditarLoteForm } from './lote-form';

const PARENTS = [
  { label: 'Início', href: '/' },
  { label: 'Lotes', href: '/lotes' },
];

export function EditarLote({ id }: { id: string }) {
  const query = useQuery(loteDetailOptions(id));

  return (
    <>
      <PageHeader
        title={
          query.data ? `Editar o lote ${query.data.numero}` : 'Editar lote'
        }
        parents={PARENTS}
      />
      {query.isSuccess ? <EditarLoteForm lote={query.data} /> : null}
      {query.isPending ? (
        <Skeleton aria-label="Carregando lote" className="h-96 max-w-2xl" />
      ) : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          action={
            query.error instanceof ApiError &&
            query.error.statusCode === 404 ? (
              <Link href="/lotes" className={buttonClasses('secundario')}>
                Voltar aos lotes
              </Link>
            ) : (
              <Button variant="secundario" onClick={() => void query.refetch()}>
                Tentar novamente
              </Button>
            )
          }
        />
      ) : null}
    </>
  );
}
