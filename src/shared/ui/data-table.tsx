// Os papéis explícitos são necessários: display: block faz o navegador perder a
// semântica de tabela, então a tag sozinha não basta, ao contrário do que a regra supõe.
// oxlint-disable jsx-a11y/prefer-tag-over-role
'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getErrorMessage } from '@/shared/api/errors';
import { isBeyondLastPage, type Paginated } from '@/shared/api/pagination';
import { Button } from './button';
import { EmptyState } from './empty-state';
import { Pagination } from './pagination';
import { Skeleton } from './skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { hasActiveFilters, useListParams } from './use-list-params';

export type DataTableColumn<Row> = {
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Valor de `orderBy` na API. Só informe se a rota permitir ordenar por ele. */
  sortKey?: string;
};

type DataTableProps<Row> = {
  /** Descreve a tabela para leitores de tela e o carregamento (`Lotes`). */
  label: string;
  query: UseQueryResult<Paginated<Row>>;
  columns: DataTableColumn<Row>[];
  getRowKey: (row: Row) => string;
  /** Lista vazia sem filtros: "nenhum cadastro ainda". */
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
};

const LINK_CLASSES = 'text-ink underline';

function SortableHeader({
  header,
  sortKey,
  direction,
}: {
  header: string;
  sortKey: string;
  direction?: 'asc' | 'desc';
}) {
  const { getHref } = useListParams();
  const order = direction === 'asc' ? 'desc' : 'asc';

  return (
    <Link
      href={getHref({ orderBy: sortKey, order })}
      scroll={false}
      className="inline-flex items-center gap-1 underline"
    >
      {header}
      {direction ? (
        <span aria-hidden="true">{direction === 'asc' ? '▲' : '▼'}</span>
      ) : null}
    </Link>
  );
}

/**
 * Listagem paginada com o estado na URL. No celular, cada linha vira um cartão
 * só com CSS, sem repetir o conteúdo no DOM. Mudar o `display` faz o navegador
 * perder a semântica de tabela, por isso os papéis são explícitos.
 */
export function DataTable<Row>({
  label,
  query,
  columns,
  getRowKey,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: DataTableProps<Row>) {
  const { params, pathname, getHref } = useListParams();

  if (query.isPending) {
    return <Skeleton aria-label={`Carregando: ${label}`} className="h-48" />;
  }

  if (query.isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-4 border border-border p-8 text-center"
      >
        <p>{getErrorMessage(query.error)}</p>
        <Button variant="secundario" onClick={() => void query.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const { data: rows, meta } = query.data;

  if (rows.length === 0) {
    if (isBeyondLastPage(meta)) {
      return (
        <EmptyState
          title="Esta página não existe mais"
          action={
            <Link href={getHref({ page: 1 })} className={LINK_CLASSES}>
              Voltar à primeira página
            </Link>
          }
        />
      );
    }

    return hasActiveFilters(params) ? (
      <EmptyState
        title="Nenhum resultado para os filtros"
        action={
          <Link href={pathname} className={LINK_CLASSES}>
            Limpar filtros
          </Link>
        }
      />
    ) : (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={query.isFetching}>
      <Table role="table" aria-label={label} className="block md:table">
        <TableHeader role="rowgroup" className="hidden md:table-header-group">
          <TableRow role="row">
            {columns.map(({ id, header, sortKey }) => {
              const direction =
                sortKey && params.orderBy === sortKey
                  ? params.order === 'desc'
                    ? 'desc'
                    : 'asc'
                  : undefined;

              return (
                <TableHead
                  key={id}
                  role="columnheader"
                  aria-sort={
                    direction === 'asc'
                      ? 'ascending'
                      : direction === 'desc'
                        ? 'descending'
                        : undefined
                  }
                >
                  {sortKey ? (
                    <SortableHeader
                      header={header}
                      sortKey={sortKey}
                      direction={direction}
                    />
                  ) : (
                    header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody
          role="rowgroup"
          className="flex flex-col gap-2 md:table-row-group"
        >
          {rows.map((row) => (
            <TableRow
              key={getRowKey(row)}
              role="row"
              className="block border p-2 md:table-row md:border-0 md:border-b md:p-0"
            >
              {columns.map(({ id, header, cell }) => (
                <TableCell
                  key={id}
                  role="cell"
                  className="flex items-start justify-between gap-4 px-1 py-1 md:table-cell md:px-3 md:py-2"
                >
                  <span className="shrink-0 font-bold md:hidden">{header}</span>
                  <span className="min-w-0 text-right wrap-anywhere md:text-left">
                    {cell(row)}
                  </span>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination meta={meta} getPageHref={(page) => getHref({ page })} />
    </div>
  );
}
