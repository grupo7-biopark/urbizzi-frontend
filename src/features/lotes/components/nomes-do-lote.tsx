'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  loteamentoDoLoteOptions,
  quadraDoLoteOptions,
} from '../api/lotes.queries';

function Nome({
  nome,
  isPending,
  rotulo,
}: {
  nome: string | undefined;
  isPending: boolean;
  rotulo: string;
}) {
  if (isPending) {
    return (
      <Skeleton aria-label={`Carregando ${rotulo}`} className="h-4 w-24" />
    );
  }

  return nome ?? <span className="text-ink-muted">Não disponível</span>;
}

/** Linhas do mesmo loteamento dividem a mesma query, e a busca é uma só. */
export function NomeLoteamento({ id }: { id: string }) {
  const { data, isPending } = useQuery(loteamentoDoLoteOptions(id));

  return <Nome nome={data?.nome} isPending={isPending} rotulo="loteamento" />;
}

export function NumeroQuadra({ id }: { id: string }) {
  const { data, isPending } = useQuery(quadraDoLoteOptions(id));

  return <Nome nome={data?.numero} isPending={isPending} rotulo="quadra" />;
}
