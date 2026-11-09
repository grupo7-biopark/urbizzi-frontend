'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Button, buttonClasses } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/empty-state';
import { IconEditar } from '@/shared/ui/icon';
import { maskCpfCnpj, maskTelefone } from '@/shared/ui/masks';
import { PageHeader } from '@/shared/ui/page-header';
import { Panel } from '@/shared/ui/panel';
import { Skeleton } from '@/shared/ui/skeleton';
import { clienteDetailOptions } from '../api/clientes.queries';
import type { ClientesSearch } from '../schemas/clientes-search.schema';
import { ClienteHistorico } from './cliente-historico';

const PARENTS = [
  { label: 'Início', href: '/' },
  { label: 'Clientes', href: '/clientes' },
];

export function ClienteDetalhe({
  id,
  search,
  podeEditar,
}: {
  id: string;
  search: ClientesSearch;
  podeEditar: boolean;
}) {
  const query = useQuery(clienteDetailOptions(id));

  if (query.isPending) {
    return (
      <>
        <PageHeader title="Cliente" parents={PARENTS} />
        <Skeleton aria-label="Carregando cliente" className="h-64" />
      </>
    );
  }

  if (query.isError) {
    return (
      <>
        <PageHeader title="Cliente" parents={PARENTS} />
        <ErrorState
          message={getErrorMessage(query.error)}
          action={
            query.error instanceof ApiError &&
            query.error.statusCode === 404 ? (
              <Link href="/clientes" className={buttonClasses('secundario')}>
                Voltar aos clientes
              </Link>
            ) : (
              <Button variant="secundario" onClick={() => void query.refetch()}>
                Tentar novamente
              </Button>
            )
          }
        />
      </>
    );
  }

  const cliente = query.data;
  const campos = [
    {
      rotulo: cliente.documento.length === 11 ? 'CPF' : 'CNPJ',
      valor: maskCpfCnpj(cliente.documento),
    },
    {
      rotulo: 'Telefone',
      valor: cliente.telefone ? maskTelefone(cliente.telefone) : null,
    },
    { rotulo: 'E-mail', valor: cliente.email },
    { rotulo: 'Observações', valor: cliente.observacoes },
  ];

  return (
    <>
      <PageHeader
        title={cliente.nome}
        parents={PARENTS}
        actions={
          podeEditar ? (
            <Link
              href={`/clientes/${id}/editar`}
              className={buttonClasses('secundario')}
            >
              <IconEditar className="size-4" />
              Editar cliente
            </Link>
          ) : null
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel title="Dados do cliente">
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {campos.map(({ rotulo, valor }) => (
              <div key={rotulo} className="min-w-0">
                <dt className="text-caption text-ink-muted">{rotulo}</dt>
                <dd className="mt-1 whitespace-pre-line wrap-anywhere">
                  {valor || 'Não informado'}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
        <ClienteHistorico id={id} search={search} />
      </div>
    </>
  );
}
