// Os papéis explícitos são necessários: display: block faz o navegador perder a
// semântica de tabela, então a tag sozinha não basta, ao contrário do que a regra supõe.
// oxlint-disable jsx-a11y/prefer-tag-over-role
'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getErrorMessage } from '@/shared/api/errors';
import { isBeyondLastPage, type Paginated } from '@/shared/api/pagination';
import { Button, buttonClasses } from './button';
import { cn } from './cn';
import { EmptyState, ErrorState } from './empty-state';
import { IconBusca } from './icon';
import { Pagination } from './pagination';
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
  /** Alinha números e valores à direita, para compará-los na vertical. */
  align?: 'right';
  /** Coluna de botões: à direita na tabela e sem rótulo, no rodapé do cartão. */
  acoes?: boolean;
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

const SKELETON_ROWS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-2/5', 'w-3/5'];

/** No formato da tabela, para a tela não mudar de forma quando os dados chegam. */
function TableSkeleton({ label }: { label: string }) {
  return (
    <output
      aria-label={`Carregando: ${label}`}
      className="block border border-border bg-surface-panel"
    >
      {SKELETON_ROWS.map((width) => (
        <span
          key={width}
          className="flex items-center gap-6 border-b border-border px-4 py-4 last:border-b-0"
        >
          <span className="block grow">
            <span
              className={cn(
                'block h-4 animate-pulse bg-surface-hover motion-reduce:animate-none',
                width,
              )}
            />
          </span>
          <span className="block h-4 w-1/4 animate-pulse bg-surface-hover motion-reduce:animate-none" />
        </span>
      ))}
    </output>
  );
}

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
      className="inline-flex items-center gap-1 underline-offset-2 hover:text-ink hover:underline"
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
    return <TableSkeleton label={label} />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        action={
          <Button variant="secundario" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  const { data: rows, meta } = query.data;

  if (rows.length === 0) {
    if (isBeyondLastPage(meta)) {
      return (
        <EmptyState
          title="Esta página não existe mais"
          action={
            <Link
              href={getHref({ page: 1 })}
              className={buttonClasses('secundario')}
            >
              Voltar à primeira página
            </Link>
          }
        />
      );
    }

    return hasActiveFilters(params) ? (
      <EmptyState
        title="Nenhum resultado para os filtros"
        description="Revise a busca ou limpe os filtros para ver tudo."
        icon={<IconBusca />}
        action={
          <Link href={pathname} className={buttonClasses('secundario')}>
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
    <div className="flex flex-col gap-3" aria-busy={query.isFetching}>
      <Table
        role="table"
        aria-label={label}
        className={cn(
          'block transition-opacity duration-150 md:table md:border md:border-border md:bg-surface-panel',
          query.isPlaceholderData && 'opacity-60',
        )}
      >
        <TableHeader role="rowgroup" className="hidden md:table-header-group">
          <TableRow role="row">
            {columns.map(({ id, header, sortKey, align, acoes }) => {
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
                  className={cn((align === 'right' || acoes) && 'text-right')}
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
          className="flex flex-col gap-3 md:table-row-group"
        >
          {rows.map((row) => (
            <TableRow
              key={getRowKey(row)}
              role="row"
              className="block border border-border bg-surface-panel p-4 transition-colors duration-150 md:table-row md:border-0 md:border-b md:bg-transparent md:p-0 md:last:border-b-0 md:hover:bg-surface-hover"
            >
              {columns.map(({ id, header, cell, align, acoes }) => (
                <TableCell
                  key={id}
                  role="cell"
                  className={cn(
                    // `max-md:`: o `cn` só concatena, e o padding base do `TableCell` venceria.
                    'flex flex-col gap-0.5 max-md:px-0 max-md:py-1.5 max-md:first:pt-0 max-md:last:pb-0 md:table-cell',
                    acoes &&
                      // Sem ação para esta linha, o cartão não ganha um rodapé vazio.
                      'border-border max-md:mt-2 max-md:border-t max-md:pt-3 max-md:has-[>span:empty]:hidden',
                    (align === 'right' || acoes) && 'md:text-right',
                  )}
                >
                  {acoes ? null : (
                    <span className="text-caption text-ink-muted md:hidden">
                      {header}
                    </span>
                  )}
                  <span className="min-w-0 wrap-anywhere">{cell(row)}</span>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-muted tabular-nums">
          {meta.total === 1
            ? '1 resultado'
            : `${meta.total.toLocaleString('pt-BR')} resultados`}
        </p>
        <Pagination meta={meta} getPageHref={(page) => getHref({ page })} />
      </div>
    </div>
  );
}
