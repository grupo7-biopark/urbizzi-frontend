'use client';

import { useQuery } from '@tanstack/react-query';
import { usePermissao } from '@/shared/auth/use-permissao';
import { pendentesOptions } from '../api/propostas.queries';

export function ContadorPendencias() {
  const pode = usePermissao();
  const permitido = pode('analisarPropostas');
  const query = useQuery({
    ...pendentesOptions({ page: 1, pageSize: 1 }),
    enabled: permitido,
  });
  if (!permitido) return null;
  const total = query.data?.meta.total;
  return (
    <output
      className="ml-auto border border-current px-1 text-caption tabular-nums"
      aria-label={
        total === undefined
          ? 'Contagem de pendências indisponível'
          : `${total} ${total === 1 ? 'proposta pendente' : 'propostas pendentes'}`
      }
      title={
        query.isError
          ? 'Não foi possível atualizar a contagem de pendências.'
          : 'Propostas pendentes'
      }
    >
      {query.isPending ? '…' : (total ?? '—')}
    </output>
  );
}
