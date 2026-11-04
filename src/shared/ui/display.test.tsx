import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, StatusLoteBadge, StatusPropostaBadge } from './badge';
import { EmptyState } from './empty-state';
import { getPaginationItems, Pagination } from './pagination';
import { Skeleton } from './skeleton';
import { Spinner } from './spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

describe('Badge', () => {
  it.each([
    ['DISPONIVEL', 'Disponível', 'bg-status-disponivel'],
    ['RESERVADO', 'Reservado', 'bg-status-reservado'],
    ['VENDIDO', 'Vendido', 'bg-status-vendido'],
    ['BLOQUEADO', 'Bloqueado', 'bg-status-bloqueado'],
  ] as const)('lote %s mostra cor e texto', (status, texto, classe) => {
    render(<StatusLoteBadge status={status} />);

    expect(screen.getByText(texto)).toHaveClass(classe);
  });

  it.each([
    ['EM_ANALISE', 'Em análise', 'bg-surface-alt'],
    ['APROVADA', 'Aprovada', 'bg-status-disponivel'],
    ['REJEITADA', 'Rejeitada', 'bg-danger'],
  ] as const)('proposta %s mostra cor e texto', (status, texto, classe) => {
    render(<StatusPropostaBadge status={status} />);

    expect(screen.getByText(texto)).toHaveClass(classe);
  });

  it('é neutro por padrão', () => {
    render(<Badge>Rascunho</Badge>);

    expect(screen.getByText('Rascunho')).toHaveClass('bg-surface-alt');
  });
});

describe('getPaginationItems', () => {
  it.each([
    [1, 1, [1]],
    [1, 3, [1, 2, 3]],
    [1, 9, [1, 2, 'reticencias', 9]],
    [5, 9, [1, 'reticencias', 4, 5, 6, 'reticencias', 9]],
    [9, 9, [1, 'reticencias', 8, 9]],
    [3, 9, [1, 2, 3, 4, 'reticencias', 9]],
  ])('página %i de %i', (page, total, esperado) => {
    expect(getPaginationItems(page, total)).toEqual(esperado);
  });
});

describe('Pagination', () => {
  const getPageHref = (page: number) => `/lotes?page=${page}`;

  it('marca a página atual e aponta para as vizinhas', () => {
    render(
      <Pagination
        meta={{ page: 2, totalPages: 3 }}
        getPageHref={getPageHref}
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Paginação' });

    expect(within(nav).getByRole('link', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Anterior' })).toHaveAttribute(
      'href',
      '/lotes?page=1',
    );
    expect(within(nav).getByRole('link', { name: 'Próxima' })).toHaveAttribute(
      'href',
      '/lotes?page=3',
    );
  });

  it('desabilita Anterior na primeira e Próxima na última', () => {
    const { rerender } = render(
      <Pagination
        meta={{ page: 1, totalPages: 2 }}
        getPageHref={getPageHref}
      />,
    );

    expect(screen.queryByRole('link', { name: 'Anterior' })).toBeNull();
    expect(screen.getByText('Anterior')).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    rerender(
      <Pagination
        meta={{ page: 2, totalPages: 2 }}
        getPageHref={getPageHref}
      />,
    );

    expect(screen.queryByRole('link', { name: 'Próxima' })).toBeNull();
  });

  it('mostra reticências em saltos e nada com uma página só', () => {
    const { rerender, container } = render(
      <Pagination
        meta={{ page: 5, totalPages: 9 }}
        getPageHref={getPageHref}
      />,
    );

    expect(screen.getAllByText('…')).toHaveLength(2);

    rerender(
      <Pagination
        meta={{ page: 1, totalPages: 1 }}
        getPageHref={getPageHref}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('estados', () => {
  it('Skeleton e Spinner têm nome acessível', () => {
    render(
      <>
        <Skeleton aria-label="Carregando lotes" />
        <Spinner />
      </>,
    );

    expect(
      screen.getByRole('status', { name: 'Carregando lotes' }),
    ).toBeVisible();
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeVisible();
  });

  it('EmptyState mostra descrição e ação quando informadas', () => {
    const { rerender } = render(<EmptyState title="Nada aqui" />);

    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(
      <EmptyState
        title="Nada aqui"
        description="Cadastre o primeiro"
        action={<button type="button">Novo</button>}
      />,
    );

    expect(screen.getByText('Cadastre o primeiro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument();
  });
});

describe('Table', () => {
  it('monta uma tabela semântica com cabeçalho de coluna', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lote</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>12</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole('columnheader', { name: 'Lote' })).toHaveAttribute(
      'scope',
      'col',
    );
    expect(screen.getByRole('cell', { name: '12' })).toBeInTheDocument();
  });
});
