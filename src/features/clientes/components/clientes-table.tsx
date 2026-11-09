'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { buttonClasses } from '@/shared/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { IconEditar, IconMais } from '@/shared/ui/icon';
import { DebouncedSearch, FilterBar } from '@/shared/ui/list-filters';
import { useListParams } from '@/shared/ui/use-list-params';
import type { ClienteResumo } from '../api/clientes.api';
import { clientesListOptions } from '../api/clientes.queries';
import type { ClientesSearch } from '../schemas/clientes-search.schema';

// A lista mostra só o nome: documento e contatos ficam no cadastro (LGPD).
const COLUNAS: DataTableColumn<ClienteResumo>[] = [
  {
    id: 'nome',
    header: 'Nome',
    cell: (cliente) => (
      <Link
        href={`/clientes/${cliente.id}/editar`}
        className="-my-1 inline-block py-1 font-bold text-ink underline-offset-2 hover:underline"
      >
        {cliente.nome}
      </Link>
    ),
  },
  {
    id: 'acoes',
    header: 'Ações',
    acoes: true,
    cell: (cliente) => (
      <span className="flex gap-1 *:grow md:justify-end md:*:grow-0">
        <Link
          href={`/clientes/${cliente.id}/editar`}
          aria-label={`Editar ${cliente.nome}`}
          className={buttonClasses('fantasma', undefined, 'compacto')}
        >
          <IconEditar className="size-4" />
          Editar
        </Link>
      </span>
    ),
  },
];

export function NovoClienteLink() {
  return (
    <Link href="/clientes/novo" className={buttonClasses('primario')}>
      <IconMais className="size-4" />
      Novo cliente
    </Link>
  );
}

export function ClientesTable({ search }: { search: ClientesSearch }) {
  // A busca pode ser um CPF: fica no estado do componente, nunca na URL.
  const [q, setQ] = useState('');
  const { setParams } = useListParams();
  const query = useQuery(
    clientesListOptions({ ...search, ...(q ? { q } : {}) }),
  );

  function handleSearch(value: string) {
    setQ(value);
    // Mudar a busca muda o resultado: volta à primeira página.
    if (search.page !== 1) {
      setParams({});
    }
  }

  return (
    <>
      <FilterBar>
        <DebouncedSearch
          label="Buscar por nome ou CPF/CNPJ"
          value={q}
          onSearch={handleSearch}
        />
      </FilterBar>
      <DataTable
        label="Clientes"
        query={query}
        columns={COLUNAS}
        getRowKey={(cliente) => cliente.id}
        emptyTitle={
          q ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'
        }
        emptyDescription={
          q
            ? 'Confira o nome ou o documento, ou cadastre o cliente.'
            : 'Cadastre o primeiro cliente.'
        }
        emptyAction={<NovoClienteLink />}
      />
    </>
  );
}
