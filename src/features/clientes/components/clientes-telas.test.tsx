import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/ui/toast';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeCliente } from '@/test/factories/cliente.factory';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import { EditarCliente, NovoClienteForm } from './cliente-form';
import { ClientesTable } from './clientes-table';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const ID = '2872822b-14be-41ea-881f-a8c0c11c1ffd';
const OUTRO_ID = '5b0e9a77-3c1d-4f2e-9a8b-7c6d5e4f3a21';
const SEARCH = { page: 1, pageSize: 20 };
const CLIENTE = makeCliente({
  id: ID,
  nome: 'Maria Souza',
  telefone: '45999998888',
  email: 'maria@exemplo.com',
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

function erro(statusCode: number, code: string, message: string) {
  return HttpResponse.json(makeErrorResponse({ statusCode, code, message }), {
    status: statusCode,
  });
}

/** Responde à lista e guarda as buscas recebidas. */
function mockLista(
  responder: (q: string | null) => { id: string; nome: string }[] = () => [
    { id: ID, nome: 'Maria Souza' },
  ],
) {
  const buscas: (string | null)[] = [];
  server.use(
    http.get('/v1/clientes', ({ request, response }) => {
      const q = new URL(request.url).searchParams.get('q');
      buscas.push(q);
      const data = responder(q);
      return response(200).json({
        data,
        meta: { page: 1, pageSize: 20, total: data.length, totalPages: 1 },
      });
    }),
  );
  return buscas;
}

async function preencher(
  user: ReturnType<typeof userEvent.setup>,
  campos: Record<string, string>,
) {
  for (const [rotulo, valor] of Object.entries(campos)) {
    const campo = screen.getByLabelText(new RegExp(`^${rotulo}`));
    await user.clear(campo);
    if (valor) {
      await user.type(campo, valor);
    }
  }
}

beforeEach(() => {
  setTestUrl('/clientes');
});

describe('ClientesTable', () => {
  it('lista só o nome, com o link para o cadastro, sem violações', async () => {
    mockLista();

    const { container } = renderTela(<ClientesTable search={SEARCH} />);

    const link = await screen.findByRole('link', { name: 'Maria Souza' });
    expect(link).toHaveAttribute('href', `/clientes/${ID}`);
    expect(
      screen.getByRole('link', { name: 'Editar Maria Souza' }),
    ).toHaveAttribute('href', `/clientes/${ID}/editar`);
    expect(
      screen.getByRole('columnheader', { name: 'Nome' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('529.982.247-25')).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('busca por documento sem levar a busca para a URL e volta à primeira página', async () => {
    setTestUrl('/clientes?page=2');
    const buscas = mockLista((q) =>
      q === '529.982.247-25' ? [{ id: ID, nome: 'Maria Souza' }] : [],
    );
    const user = userEvent.setup();
    renderTela(<ClientesTable search={{ ...SEARCH, page: 2 }} />);

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nome ou CPF/CNPJ' }),
      '529.982.247-25',
    );

    await waitFor(() => expect(buscas).toContain('529.982.247-25'));
    expect(window.location.search).toBe('');
    expect(window.location.href).not.toContain('529');
  });

  it('diferencia a lista vazia da busca sem resultado', async () => {
    mockLista(() => []);
    const user = userEvent.setup();
    renderTela(<ClientesTable search={SEARCH} />);

    expect(
      await screen.findByText('Nenhum cliente cadastrado'),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nome ou CPF/CNPJ' }),
      'joao',
    );

    expect(
      await screen.findByText('Nenhum cliente encontrado'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Novo cliente/ })).toHaveAttribute(
      'href',
      '/clientes/novo',
    );
  });
});

describe('NovoClienteForm', () => {
  it('recusa CPF inválido antes de enviar', async () => {
    const corpos: unknown[] = [];
    server.use(
      mswHttp.post('*/v1/clientes', () => {
        corpos.push(true);
        return HttpResponse.json({});
      }),
    );
    const user = userEvent.setup();
    renderTela(<NovoClienteForm />);

    await preencher(user, {
      Nome: 'Maria Souza',
      'CPF ou CNPJ': '52998224724',
    });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('CPF inválido')).toBeInTheDocument();
    expect(corpos).toEqual([]);
  });

  it('cadastra com o documento e o telefone só com dígitos e abre o cadastro', async () => {
    const corpos: unknown[] = [];
    server.use(
      mswHttp.post('*/v1/clientes', async ({ request }) => {
        corpos.push(await request.json());
        return HttpResponse.json(CLIENTE, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderTela(<NovoClienteForm />);

    await preencher(user, {
      Nome: 'Maria Souza',
      'CPF ou CNPJ': '52998224725',
      Telefone: '45999998888',
      'E-mail': 'maria@exemplo.com',
    });
    expect(screen.getByLabelText(/^CPF ou CNPJ/)).toHaveValue('529.982.247-25');
    expect(screen.getByLabelText(/^Telefone/)).toHaveValue('(45) 99999-8888');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(window.location.pathname).toBe(`/clientes/${ID}`),
    );
    expect(corpos).toEqual([
      {
        nome: 'Maria Souza',
        documento: '52998224725',
        telefone: '45999998888',
        email: 'maria@exemplo.com',
        observacoes: null,
      },
    ]);
  });

  it('no documento repetido, mostra a mensagem no campo e o link para o cadastro existente', async () => {
    server.use(
      mswHttp.post('*/v1/clientes', () =>
        erro(
          409,
          'CLIENTE_DOCUMENTO_DUPLICADO',
          'Já existe um cliente com esse documento',
        ),
      ),
    );
    const buscas = mockLista((q) =>
      q === '52998224725' ? [{ id: OUTRO_ID, nome: 'Maria Antiga' }] : [],
    );
    const user = userEvent.setup();
    renderTela(<NovoClienteForm />);

    await preencher(user, {
      Nome: 'Maria Souza',
      'CPF ou CNPJ': '52998224725',
    });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Já existe um cliente com esse documento'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', {
        name: 'Abrir o cadastro de Maria Antiga',
      }),
    ).toHaveAttribute('href', `/clientes/${OUTRO_ID}`);
    expect(buscas).toEqual(['52998224725']);
  });

  it('se não achar o cadastro existente, fica só a mensagem', async () => {
    server.use(
      mswHttp.post('*/v1/clientes', () =>
        erro(
          409,
          'CLIENTE_DOCUMENTO_DUPLICADO',
          'Já existe um cliente com esse documento',
        ),
      ),
      mswHttp.get('*/v1/clientes', () =>
        erro(500, 'ERRO_INTERNO', 'Internal server error'),
      ),
    );
    const user = userEvent.setup();
    renderTela(<NovoClienteForm />);

    await preencher(user, {
      Nome: 'Maria Souza',
      'CPF ou CNPJ': '52998224725',
    });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Já existe um cliente com esse documento'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Abrir o cadastro/ }),
    ).not.toBeInTheDocument();
  });
});

describe('EditarCliente', () => {
  function mockDetalhe() {
    server.use(
      http.get('/v1/clientes/{id}', ({ response }) =>
        response(200).json(CLIENTE),
      ),
    );
  }

  it('mostra o cadastro com as máscaras e salva a mudança', async () => {
    mockDetalhe();
    const corpos: unknown[] = [];
    server.use(
      mswHttp.patch('*/v1/clientes/:id', async ({ request }) => {
        corpos.push(await request.json());
        return HttpResponse.json(CLIENTE);
      }),
    );
    const user = userEvent.setup();
    const { container } = renderTela(<EditarCliente id={ID} />);

    expect(screen.getByLabelText('Carregando cliente')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Maria Souza' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^CPF ou CNPJ/)).toHaveValue('529.982.247-25');
    await expectNoA11yViolations(container);

    await preencher(user, { 'E-mail': '' });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Cliente atualizado')).toBeInTheDocument();
    expect(corpos).toEqual([
      {
        nome: 'Maria Souza',
        documento: '52998224725',
        telefone: '45999998888',
        email: null,
        observacoes: null,
      },
    ]);
    expect(window.location.pathname).toBe(`/clientes/${ID}`);
  });

  it('cliente que não existe mostra o erro e a volta para a lista', async () => {
    server.use(
      mswHttp.get('*/v1/clientes/:id', () =>
        erro(404, 'CLIENTE_NAO_ENCONTRADO', 'Cliente não encontrado'),
      ),
    );

    renderTela(<EditarCliente id={ID} />);

    expect(
      await screen.findByText('Cliente não encontrado'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Voltar aos clientes' }),
    ).toHaveAttribute('href', '/clientes');
  });

  it('em outra falha, permite tentar de novo', async () => {
    server.use(
      mswHttp.get('*/v1/clientes/:id', () =>
        erro(500, 'ERRO_INTERNO', 'Internal server error'),
      ),
    );
    const user = userEvent.setup();
    renderTela(<EditarCliente id={ID} />);

    await user.click(
      await screen.findByRole('button', { name: 'Tentar novamente' }),
    );
    mockDetalhe();
    await user.click(
      await screen.findByRole('button', { name: 'Tentar novamente' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Maria Souza' }),
    ).toBeInTheDocument();
  });
});
