'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePermissao } from '@/shared/auth/use-permissao';
import { buttonClasses } from '@/shared/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { FilterBar, UrlSearchFilter } from '@/shared/ui/list-filters';
import type { Loteamento } from '../api/loteamentos.api';
import { loteamentosListOptions } from '../api/loteamentos.queries';
import type { LoteamentosSearch } from '../schemas/loteamentos-search.schema';
import { RemoverLoteamento } from './remover-loteamento';

const COLUNAS: DataTableColumn<Loteamento>[] = [
  {
    id: 'nome',
    header: 'Nome',
    cell: (loteamento) => (
      <Link
        href={`/loteamentos/${loteamento.id}`}
        className="text-ink underline"
      >
        {loteamento.nome}
      </Link>
    ),
  },
  {
    id: 'localizacao',
    header: 'Localização',
    cell: (loteamento) => loteamento.localizacao ?? 'Não informada',
  },
];

const COLUNA_ACOES: DataTableColumn<Loteamento> = {
  id: 'acoes',
  header: 'Ações',
  cell: (loteamento) => (
    <span className="inline-flex flex-wrap justify-end gap-2 md:justify-start">
      <Link
        href={`/loteamentos/${loteamento.id}/editar`}
        aria-label={`Editar ${loteamento.nome}`}
        className={buttonClasses('secundario')}
      >
        Editar
      </Link>
      <RemoverLoteamento loteamento={loteamento} />
    </span>
  ),
};

export function NovoLoteamentoLink() {
  return (
    <Link href="/loteamentos/novo" className={buttonClasses('primario')}>
      Novo loteamento
    </Link>
  );
}

export function LoteamentosTable({ search }: { search: LoteamentosSearch }) {
  const query = useQuery(loteamentosListOptions(search));
  const pode = usePermissao();
  const podeGerenciar = pode('gerenciarCadastros');

  return (
    <>
      <FilterBar>
        <UrlSearchFilter label="Buscar por nome" />
      </FilterBar>
      <DataTable
        label="Loteamentos"
        query={query}
        columns={podeGerenciar ? [...COLUNAS, COLUNA_ACOES] : COLUNAS}
        getRowKey={(loteamento) => loteamento.id}
        emptyTitle="Nenhum loteamento cadastrado"
        emptyDescription={
          podeGerenciar ? 'Cadastre o primeiro loteamento.' : undefined
        }
        emptyAction={podeGerenciar ? <NovoLoteamentoLink /> : undefined}
      />
    </>
  );
}
