'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePermissao } from '@/shared/auth/use-permissao';
import { buttonClasses } from '@/shared/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { IconEditar, IconMais } from '@/shared/ui/icon';
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
        className="-my-1 inline-block py-1 font-bold text-ink underline-offset-2 hover:underline"
      >
        {loteamento.nome}
      </Link>
    ),
  },
  {
    id: 'localizacao',
    header: 'Localização',
    cell: (loteamento) =>
      loteamento.localizacao ?? (
        <span className="text-ink-muted">Não informada</span>
      ),
  },
];

const COLUNA_ACOES: DataTableColumn<Loteamento> = {
  id: 'acoes',
  header: 'Ações',
  acoes: true,
  // Ações discretas: a linha repete, e os dados é que devem chamar a atenção.
  cell: (loteamento) => (
    <span className="flex flex-wrap gap-1 *:grow md:justify-end md:*:grow-0">
      <Link
        href={`/loteamentos/${loteamento.id}#quadras`}
        aria-label={`Quadras de ${loteamento.nome}`}
        className={buttonClasses('fantasma', undefined, 'compacto')}
      >
        Quadras
      </Link>
      <Link
        href={`/loteamentos/${loteamento.id}/editar`}
        aria-label={`Editar ${loteamento.nome}`}
        className={buttonClasses('fantasma', undefined, 'compacto')}
      >
        <IconEditar className="size-4" />
        Editar
      </Link>
      <RemoverLoteamento loteamento={loteamento} size="compacto" />
    </span>
  ),
};

export function NovoLoteamentoLink() {
  return (
    <Link href="/loteamentos/novo" className={buttonClasses('primario')}>
      <IconMais className="size-4" />
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
