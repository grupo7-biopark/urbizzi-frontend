'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePermissao } from '@/shared/auth/use-permissao';
import { StatusLoteBadge } from '@/shared/ui/badge';
import { buttonClasses } from '@/shared/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { IconEditar, IconMais } from '@/shared/ui/icon';
import {
  FilterBar,
  UrlSearchFilter,
  UrlSelectFilter,
} from '@/shared/ui/list-filters';
import { formatArea, formatMoeda } from '@/shared/ui/masks';
import type { Lote, StatusLote } from '../api/lotes.api';
import {
  loteamentosOpcoesOptions,
  lotesListOptions,
  quadrasOpcoesOptions,
} from '../api/lotes.queries';
import {
  toListLotesQuery,
  type LotesSearch,
} from '../schemas/lotes-search.schema';
import { NomeLoteamento, NumeroQuadra } from './nomes-do-lote';
import { RemoverLote } from './remover-lote';

const OPCOES_STATUS: { value: StatusLote; label: string }[] = [
  { value: 'DISPONIVEL', label: 'Disponível' },
  { value: 'RESERVADO', label: 'Reservado' },
  { value: 'VENDIDO', label: 'Vendido' },
  { value: 'BLOQUEADO', label: 'Bloqueado' },
];

const COLUNAS: DataTableColumn<Lote>[] = [
  {
    id: 'loteamento',
    header: 'Loteamento',
    cell: ({ loteamentoId }) => <NomeLoteamento id={loteamentoId} />,
  },
  {
    id: 'quadra',
    header: 'Quadra',
    cell: ({ quadraId }) => <NumeroQuadra id={quadraId} />,
  },
  {
    id: 'numero',
    header: 'Número',
    cell: ({ id, numero }) => (
      <Link
        href={`/lotes/${id}`}
        className="-my-1 inline-block py-1 font-bold text-ink underline-offset-2 hover:underline"
      >
        {numero}
      </Link>
    ),
  },
  {
    id: 'area',
    header: 'Área',
    align: 'right',
    cell: ({ areaM2 }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatArea(areaM2)}
      </span>
    ),
  },
  {
    id: 'valor',
    header: 'Valor',
    align: 'right',
    cell: ({ valor }) =>
      valor === null ? (
        <span className="text-ink-muted">Não definido</span>
      ) : (
        <span className="whitespace-nowrap tabular-nums">
          {formatMoeda(valor)}
        </span>
      ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ status }) => <StatusLoteBadge status={status} />,
  },
  {
    id: 'valorPublico',
    header: 'Valor público',
    cell: ({ exibirValorPublico }) => (exibirValorPublico ? 'Sim' : 'Não'),
  },
];

const COLUNA_ACOES: DataTableColumn<Lote> = {
  id: 'acoes',
  header: 'Ações',
  acoes: true,
  cell: (lote) => (
    <span className="flex gap-1 *:grow md:justify-end md:*:grow-0">
      <Link
        href={`/lotes/${lote.id}/editar`}
        aria-label={`Editar o lote ${lote.numero}`}
        className={buttonClasses('fantasma', undefined, 'compacto')}
      >
        <IconEditar className="size-4" />
        Editar
      </Link>
      <RemoverLote lote={lote} />
    </span>
  ),
};

export function NovoLoteLink() {
  return (
    <Link href="/lotes/novo" className={buttonClasses('primario')}>
      <IconMais className="size-4" />
      Novo lote
    </Link>
  );
}

function FiltrosLotes({ loteamentoId }: { loteamentoId?: string }) {
  const loteamentos = useQuery(loteamentosOpcoesOptions());
  const quadras = useQuery(quadrasOpcoesOptions(loteamentoId));

  return (
    <FilterBar>
      <UrlSearchFilter label="Buscar por número" />
      <UrlSelectFilter
        name="loteamentoId"
        label="Loteamento"
        // A quadra escolhida pertence ao loteamento anterior.
        clears={['quadraId']}
        options={(loteamentos.data?.data ?? []).map(({ id, nome }) => ({
          value: id,
          label: nome,
        }))}
      />
      <UrlSelectFilter
        name="quadraId"
        label="Quadra"
        allLabel="Todas"
        disabled={!loteamentoId}
        options={(quadras.data?.data ?? []).map(({ id, numero }) => ({
          value: id,
          label: numero,
        }))}
      />
      <UrlSelectFilter name="status" label="Status" options={OPCOES_STATUS} />
    </FilterBar>
  );
}

export function LotesTable({ search }: { search: LotesSearch }) {
  const query = useQuery(lotesListOptions(toListLotesQuery(search)));
  const pode = usePermissao();
  const podeGerenciar = pode('gerenciarCadastros');

  return (
    <>
      <FiltrosLotes loteamentoId={search.loteamentoId} />
      <DataTable
        label="Lotes"
        query={query}
        columns={podeGerenciar ? [...COLUNAS, COLUNA_ACOES] : COLUNAS}
        getRowKey={({ id }) => id}
        emptyTitle="Nenhum lote cadastrado"
        emptyDescription={
          podeGerenciar ? 'Cadastre o primeiro lote.' : undefined
        }
        emptyAction={podeGerenciar ? <NovoLoteLink /> : undefined}
      />
    </>
  );
}
