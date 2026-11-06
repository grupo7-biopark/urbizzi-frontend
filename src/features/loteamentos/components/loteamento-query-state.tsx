'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import Link from 'next/link';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/button';
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
    <div
      role="alert"
      className="flex flex-col items-center gap-4 border border-border p-8 text-center"
    >
      <p>{getErrorMessage(query.error)}</p>
      {naoEncontrado ? (
        <Link href="/loteamentos" className="text-ink underline">
          Voltar aos loteamentos
        </Link>
      ) : (
        <Button variant="secundario" onClick={() => void query.refetch()}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
