'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import Link from 'next/link';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Button, buttonClasses } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import type { Loteamento } from '../api/loteamentos.api';

/** Carregamento e erro das telas de um loteamento só. */
export function LoteamentoQueryState({
  query,
}: {
  query: UseQueryResult<Loteamento>;
}) {
  if (!query.isError) {
    return <Skeleton aria-label="Carregando loteamento" className="h-48" />;
  }

  const naoEncontrado =
    query.error instanceof ApiError && query.error.statusCode === 404;

  return (
    <ErrorState
      message={getErrorMessage(query.error)}
      action={
        naoEncontrado ? (
          <Link href="/loteamentos" className={buttonClasses('secundario')}>
            Voltar aos loteamentos
          </Link>
        ) : (
          <Button variant="secundario" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        )
      }
    />
  );
}
