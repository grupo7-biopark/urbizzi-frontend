import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Perfil } from '@/shared/auth/permissoes';
import { ToastProvider } from '@/shared/ui/toast';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeLoteamento } from '@/test/factories/loteamento.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import { EditarLoteamento, LoteamentoDetalhe } from './loteamento-detalhe';
import { LoteamentosTable } from './loteamentos-table';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const ID = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';
const SEARCH = { page: 1, pageSize: 20 };
const LOTEAMENTO = makeLoteamento({
  id: ID,
  nome: 'Bela Vista',
  localizacao: 'Toledo - PR',
});

function renderTela(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

function mockPerfil(perfil: Perfil) {
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json({
        id: '7d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
        nome: 'Pessoa Teste',
        email: 'pessoa@exemplo.com',
        perfil,
      }),
    ),
  );
}

function mockLista(linhas = [LOTEAMENTO]) {
  const buscas: string[] = [];
  server.use(
    http.get('/v1/loteamentos', ({ request, response }) => {
      buscas.push(new URL(request.url).search);
      return response(200).json({
        data: linhas,
        meta: { page: 1, pageSize: 20, total: linhas.length, totalPages: 1 },
      });
    }),
  );
  return buscas;
}

function mockDetalhe() {
  server.use(
    http.get('/v1/loteamentos/{id}', ({ response }) =>
      response(200).json(LOTEAMENTO),
    ),
  );
}

function mockErroNaRemocao() {
  server.use(
    http.untyped.delete('*/v1/loteamentos/*', () =>
      HttpResponse.json(
        makeErrorResponse({
          statusCode: 409,
          code: 'LOTEAMENTO_COM_QUADRAS',
          message:
            'Não é possível excluir um loteamento com quadras cadastradas',
        }),
        { status: 409 },
      ),
    ),
  );
}

function mockRemocao() {
  const removidos: string[] = [];
  server.use(
    http.untyped.delete('*/v1/loteamentos/:id', ({ params }) => {
      removidos.push(String(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return removidos;
}

beforeEach(() => {
  setTestUrl('/loteamentos');
});

describe('LoteamentosTable', () => {
  it.each<Perfil>(['ADMINISTRADOR', 'GESTOR'])(
    '%s vê as ações de cada linha',
    async (perfil) => {
      mockPerfil(perfil);
      mockLista();

      renderTela(<LoteamentosTable search={SEARCH} />);

      expect(
        await screen.findByRole('link', { name: 'Editar Bela Vista' }),
      ).toHaveAttribute('href', `/loteamentos/${ID}/editar`);
      expect(
        screen.getByRole('button', { name: 'Remover Bela Vista' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Bela Vista' })).toHaveAttribute(
        'href',
        `/loteamentos/${ID}`,
      );
    },
  );

  it.each<Perfil>(['COMERCIAL', 'CONSULTA'])(
    '%s só visualiza',
    async (perfil) => {
      mockPerfil(perfil);
      mockLista();

      renderTela(<LoteamentosTable search={SEARCH} />);

      expect(
        await screen.findByRole('link', { name: 'Bela Vista' }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.queryByRole('columnheader', { name: 'Ações' }),
        ).not.toBeInTheDocument(),
      );
      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
      expect(screen.queryByText('Remover')).not.toBeInTheDocument();
    },
  );

  it('mostra quando a localização não foi informada', async () => {
    mockPerfil('CONSULTA');
    mockLista([makeLoteamento({ id: ID, nome: 'Bela Vista' })]);

    renderTela(<LoteamentosTable search={SEARCH} />);

    expect(await screen.findByText('Não informada')).toBeInTheDocument();
  });

  it('consulta a API com os valores da URL', async () => {
    mockPerfil('CONSULTA');
    const buscas = mockLista();

    renderTela(
      <LoteamentosTable search={{ page: 2, pageSize: 50, q: 'bela' }} />,
    );

    await screen.findByRole('link', { name: 'Bela Vista' });
    expect(buscas).toEqual(['?page=2&pageSize=50&q=bela']);
  });

  it('com a lista vazia, oferece cadastrar a quem pode', async () => {
    mockPerfil('GESTOR');
    mockLista([]);

    renderTela(<LoteamentosTable search={SEARCH} />);

    expect(
      await screen.findByText('Nenhum loteamento cadastrado'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Novo loteamento' }),
    ).toHaveAttribute('href', '/loteamentos/novo');
  });

  it('com a lista vazia, não oferece cadastrar a quem não pode', async () => {
    mockPerfil('CONSULTA');
    mockLista([]);

    renderTela(<LoteamentosTable search={SEARCH} />);

    await screen.findByText('Nenhum loteamento cadastrado');
    await waitFor(() =>
      expect(
        screen.queryByText('Cadastre o primeiro loteamento.'),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('link', { name: 'Novo loteamento' }),
    ).not.toBeInTheDocument();
  });

  it('com quadras, mantém o diálogo aberto e mostra o motivo', async () => {
    mockPerfil('GESTOR');
    mockLista();
    mockErroNaRemocao();
    const user = userEvent.setup();
    renderTela(<LoteamentosTable search={SEARCH} />);

    await user.click(
      await screen.findByRole('button', { name: 'Remover Bela Vista' }),
    );
    const dialogo = await screen.findByRole('dialog', {
      name: 'Remover o loteamento Bela Vista?',
    });
    await user.click(
      within(dialogo).getByRole('button', { name: 'Remover loteamento' }),
    );

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Não é possível excluir um loteamento com quadras cadastradas',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('remove, avisa e busca a lista de novo', async () => {
    mockPerfil('GESTOR');
    const buscas = mockLista();
    const removidos = mockRemocao();
    const user = userEvent.setup();
    renderTela(<LoteamentosTable search={SEARCH} />);

    await user.click(
      await screen.findByRole('button', { name: 'Remover Bela Vista' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Remover loteamento' }),
    );

    expect(await screen.findByText('Loteamento removido')).toBeInTheDocument();
    expect(removidos).toEqual([ID]);
    expect(buscas).toHaveLength(2);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});

describe('LoteamentoDetalhe', () => {
  beforeEach(() => {
    setTestUrl(`/loteamentos/${ID}`);
  });

  it('mostra os dados, a entrada das quadras e a trilha', async () => {
    mockPerfil('CONSULTA');
    mockDetalhe();

    renderTela(<LoteamentoDetalhe id={ID} />);

    expect(screen.getByLabelText('Carregando loteamento')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bela Vista' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Toledo - PR')).toBeInTheDocument();
    expect(screen.getByText('Não informada')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Quadras' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Loteamentos' })).toHaveAttribute(
      'href',
      '/loteamentos',
    );
  });

  it('esconde as ações de quem não pode', async () => {
    mockPerfil('COMERCIAL');
    mockDetalhe();

    renderTela(<LoteamentoDetalhe id={ID} />);

    await screen.findByRole('heading', { level: 1, name: 'Bela Vista' });
    expect(
      screen.queryByRole('link', { name: 'Editar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Remover/ }),
    ).not.toBeInTheDocument();
  });

  it('remove e volta à listagem, tirando o detalhe do histórico', async () => {
    mockPerfil('GESTOR');
    mockDetalhe();
    mockRemocao();
    const user = userEvent.setup();
    renderTela(<LoteamentoDetalhe id={ID} />);

    await user.click(
      await screen.findByRole('button', { name: 'Remover Bela Vista' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Remover loteamento' }),
    );

    await waitFor(() => expect(window.location.pathname).toBe('/loteamentos'));
  });

  it('avisa quando o loteamento não existe, sem oferecer tentar de novo', async () => {
    mockPerfil('CONSULTA');
    server.use(
      http.untyped.get('*/v1/loteamentos/*', () =>
        HttpResponse.json(
          makeErrorResponse({
            statusCode: 404,
            code: 'LOTEAMENTO_NAO_ENCONTRADO',
            message: 'Loteamento não encontrado',
          }),
          { status: 404 },
        ),
      ),
    );

    renderTela(<LoteamentoDetalhe id={ID} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Loteamento não encontrado',
    );
    expect(
      screen.getByRole('link', { name: 'Voltar aos loteamentos' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' }),
    ).not.toBeInTheDocument();
  });

  it('em uma falha temporária, permite tentar de novo', async () => {
    mockPerfil('CONSULTA');
    let falhar = true;
    server.use(
      http.untyped.get('*/v1/loteamentos/*', () =>
        falhar
          ? HttpResponse.json(
              makeErrorResponse({
                statusCode: 500,
                code: 'ERRO_INTERNO',
                message: 'Internal server error',
              }),
              { status: 500 },
            )
          : HttpResponse.json(LOTEAMENTO),
      ),
    );
    const user = userEvent.setup();
    renderTela(<LoteamentoDetalhe id={ID} />);

    await screen.findByRole('alert');
    falhar = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bela Vista' }),
    ).toBeInTheDocument();
  });
});

describe('EditarLoteamento', () => {
  it('carrega o loteamento e preenche o formulário', async () => {
    mockDetalhe();

    renderTela(<EditarLoteamento id={ID} />);

    expect(screen.getByLabelText('Carregando loteamento')).toBeInTheDocument();
    expect(await screen.findByLabelText(/Nome/)).toHaveValue('Bela Vista');
    expect(screen.getByRole('link', { name: 'Bela Vista' })).toHaveAttribute(
      'href',
      `/loteamentos/${ID}`,
    );
  });
});
