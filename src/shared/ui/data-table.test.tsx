import { useQuery } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { DataTable, type DataTableColumn } from './data-table';
import { FilterBar, UrlSearchFilter } from './list-filters';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

type Loteamento = components['schemas']['LoteamentoDto'];

function makeLoteamento(nome: string): Loteamento {
  return {
    id: nome,
    nome,
    descricao: null,
    localizacao: null,
    createdAt: '2026-10-28T12:00:00.000Z',
    updatedAt: '2026-10-28T12:00:00.000Z',
  };
}

const COLUNAS: DataTableColumn<Loteamento>[] = [
  { id: 'nome', header: 'Nome', cell: (row) => row.nome, sortKey: 'nome' },
  {
    id: 'localizacao',
    header: 'Localização',
    cell: (row) => row.localizacao ?? 'Não informada',
  },
];

/** Como uma tela real: a URL define a consulta, e a tabela só recebe o resultado. */
function Listagem() {
  const params = Object.fromEntries(useSearchParams());
  const consulta = {
    page: Number(params.page ?? 1),
    pageSize: 2,
    ...(params.q ? { q: params.q } : {}),
  };
  const query = useQuery({
    queryKey: ['loteamentos', consulta],
    queryFn: () =>
      unwrap(api.GET('/v1/loteamentos', { params: { query: consulta } })),
  });

  return (
    <>
      <FilterBar>
        <UrlSearchFilter />
      </FilterBar>
      <DataTable
        label="Loteamentos"
        query={query}
        columns={COLUNAS}
        getRowKey={(row) => row.id}
        emptyTitle="Nenhum loteamento cadastrado"
        emptyDescription="Cadastre o primeiro."
      />
    </>
  );
}

function mockListagem(nomes: string[], totalPages = 1) {
  const buscas: string[] = [];
  server.use(
    http.get('/v1/loteamentos', ({ request, response }) => {
      const url = new URL(request.url);
      buscas.push(url.search);
      return response(200).json({
        data: nomes.map(makeLoteamento),
        meta: {
          page: Number(url.searchParams.get('page')),
          pageSize: 2,
          total: nomes.length,
          totalPages,
        },
      });
    }),
  );
  return buscas;
}

beforeEach(() => {
  setTestUrl('/loteamentos');
});

describe('DataTable', () => {
  it('mostra o carregamento e depois as linhas', async () => {
    mockListagem(['Bela Vista', 'Jardim Sul']);

    renderWithQuery(<Listagem />);

    expect(
      screen.getByLabelText('Carregando: Loteamentos'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Bela Vista')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Loteamentos' })).toBeVisible();
    expect(screen.getAllByText('Não informada')).toHaveLength(2);
  });

  it('dá a cada célula o rótulo da coluna, usado nos cartões do celular', async () => {
    mockListagem(['Bela Vista']);

    renderWithQuery(<Listagem />);

    const celula = (await screen.findByText('Bela Vista')).closest('td');
    expect(within(celula!).getByText('Nome')).toBeInTheDocument();
  });

  it('busca a página que está na URL', async () => {
    setTestUrl('/loteamentos?page=2');
    const buscas = mockListagem(['Bela Vista'], 3);

    renderWithQuery(<Listagem />);

    await screen.findByText('Bela Vista');
    expect(buscas).toEqual(['?page=2&pageSize=2']);
  });

  it('pagina mantendo os filtros da URL', async () => {
    setTestUrl('/loteamentos?q=bela&page=2');
    mockListagem(['Bela Vista'], 3);

    renderWithQuery(<Listagem />);

    expect(
      await screen.findByRole('link', { name: 'Página 3' }),
    ).toHaveAttribute('href', '/loteamentos?q=bela&page=3');
    expect(screen.getByRole('link', { name: 'Página 1' })).toHaveAttribute(
      'href',
      '/loteamentos?q=bela',
    );
    expect(screen.getByRole('link', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('filtra pela busca, só depois da espera, e volta à primeira página', async () => {
    setTestUrl('/loteamentos?page=3');
    const buscas = mockListagem(['Bela Vista']);
    const user = userEvent.setup();
    renderWithQuery(<Listagem />);
    await screen.findByText('Bela Vista');

    await user.type(screen.getByLabelText('Buscar'), 'bela');

    await waitFor(() => expect(window.location.search).toBe('?q=bela'));
    await waitFor(() =>
      expect(buscas).toEqual([
        '?page=3&pageSize=2',
        '?page=1&pageSize=2&q=bela',
      ]),
    );
  });

  it('distingue a lista vazia de nenhum resultado para os filtros', async () => {
    mockListagem([]);

    renderWithQuery(<Listagem />);

    expect(
      await screen.findByText('Nenhum loteamento cadastrado'),
    ).toBeInTheDocument();
    expect(screen.getByText('Cadastre o primeiro.')).toBeInTheDocument();
    expect(screen.queryByText('Limpar filtros')).not.toBeInTheDocument();
  });

  it('com filtros, oferece limpá-los quando nada é encontrado', async () => {
    setTestUrl('/loteamentos?q=nada');
    mockListagem([]);

    renderWithQuery(<Listagem />);

    expect(
      await screen.findByText('Nenhum resultado para os filtros'),
    ).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', {
      name: 'Limpar filtros',
    })) {
      expect(link).toHaveAttribute('href', '/loteamentos');
    }
  });

  it('além da última página, oferece voltar à primeira', async () => {
    setTestUrl('/loteamentos?page=9&q=bela');
    mockListagem([], 2);

    renderWithQuery(<Listagem />);

    expect(
      await screen.findByRole('link', { name: 'Voltar à primeira página' }),
    ).toHaveAttribute('href', '/loteamentos?q=bela');
  });

  it('mostra o erro em português e permite tentar de novo', async () => {
    let falhar = true;
    server.use(
      http.untyped.get('*/v1/loteamentos', () =>
        falhar
          ? HttpResponse.json(
              makeErrorResponse({
                statusCode: 403,
                code: 'ACESSO_NEGADO',
                message: 'Forbidden resource',
              }),
              { status: 403 },
            )
          : HttpResponse.json({
              data: [makeLoteamento('Bela Vista')],
              meta: { page: 1, pageSize: 2, total: 1, totalPages: 1 },
            }),
      ),
    );
    const user = userEvent.setup();
    renderWithQuery(<Listagem />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para executar esta ação.',
    );

    falhar = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Bela Vista')).toBeInTheDocument();
  });

  it('não expõe detalhes técnicos de uma resposta inesperada', async () => {
    server.use(
      http.untyped.get('*/v1/loteamentos', () =>
        HttpResponse.html('<html>Bad Gateway</html>', { status: 502 }),
      ),
    );

    renderWithQuery(<Listagem />);

    const alerta = await screen.findByRole('alert');
    expect(alerta).not.toHaveTextContent('Bad Gateway');
  });

  describe('ordenação', () => {
    function header(name: RegExp) {
      return screen.findByRole('columnheader', { name });
    }

    it('só oferece ordenar nas colunas com sortKey', async () => {
      mockListagem(['Bela Vista']);

      renderWithQuery(<Listagem />);

      await screen.findByText('Bela Vista');
      expect(screen.getByRole('link', { name: 'Nome' })).toHaveAttribute(
        'href',
        '/loteamentos?orderBy=nome&order=asc',
      );
      expect(
        screen.queryByRole('link', { name: 'Localização' }),
      ).not.toBeInTheDocument();
      expect(await header(/Nome/)).not.toHaveAttribute('aria-sort');
    });

    it('inverte a ordem atual e volta à primeira página', async () => {
      setTestUrl('/loteamentos?orderBy=nome&order=asc&page=2');
      mockListagem(['Bela Vista']);

      renderWithQuery(<Listagem />);

      expect(await header(/Nome/)).toHaveAttribute('aria-sort', 'ascending');
      expect(screen.getByRole('link', { name: /Nome/ })).toHaveAttribute(
        'href',
        '/loteamentos?orderBy=nome&order=desc',
      );
    });

    it('marca a ordem decrescente', async () => {
      setTestUrl('/loteamentos?orderBy=nome&order=desc');
      mockListagem(['Bela Vista']);

      renderWithQuery(<Listagem />);

      expect(await header(/Nome/)).toHaveAttribute('aria-sort', 'descending');
      expect(screen.getByRole('link', { name: /Nome/ })).toHaveAttribute(
        'href',
        '/loteamentos?orderBy=nome&order=asc',
      );
    });
  });
});
