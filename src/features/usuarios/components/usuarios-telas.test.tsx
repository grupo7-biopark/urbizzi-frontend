import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/ui/toast';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeUsuario } from '@/test/factories/usuario.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import { usuariosSearchSchema } from '../schemas/usuarios-search.schema';
import { EditarUsuario, NovoUsuarioForm } from './usuario-form';
import { UsuariosTable } from './usuarios-table';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const MARIA = makeUsuario();
const INATIVO = makeUsuario({
  id: '7b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
  nome: 'João Souza',
  email: 'joao@exemplo.com',
  perfil: 'GESTOR',
  ativo: false,
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

function mockLista(linhas = [MARIA, INATIVO]) {
  const buscas: URLSearchParams[] = [];
  server.use(
    http.get('/v1/usuarios', ({ request, response }) => {
      buscas.push(new URL(request.url).searchParams);
      return response(200).json({
        data: linhas,
        meta: { page: 1, pageSize: 20, total: linhas.length, totalPages: 1 },
      });
    }),
  );
  return buscas;
}

function erro(statusCode: number, code: string, message: string) {
  return HttpResponse.json(makeErrorResponse({ statusCode, code, message }), {
    status: statusCode,
  });
}

describe('UsuariosTable', () => {
  beforeEach(() => {
    setTestUrl('/usuarios');
  });

  function renderLista(busca: Record<string, string> = {}) {
    return renderTela(
      <UsuariosTable search={usuariosSearchSchema.parse(busca)} />,
    );
  }

  it('mostra nome, e-mail, perfil e situação, sem violações', async () => {
    mockLista();

    const { container } = renderLista();

    const maria = (
      await screen.findByRole('link', { name: 'Maria Silva' })
    ).closest('tr') as HTMLElement;
    expect(within(maria).getByText('maria@exemplo.com')).toBeInTheDocument();
    expect(within(maria).getByText('Comercial')).toBeInTheDocument();
    expect(within(maria).getByText('Ativo')).toBeInTheDocument();
    expect(
      within(maria).getByRole('button', { name: 'Desativar Maria Silva' }),
    ).toBeInTheDocument();

    const joao = screen
      .getByRole('link', { name: 'João Souza' })
      .closest('tr') as HTMLElement;
    expect(within(joao).getByText('Inativo')).toBeInTheDocument();
    expect(
      within(joao).getByRole('button', { name: 'Ativar João Souza' }),
    ).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('envia os filtros à API, com a situação como booleano', async () => {
    const buscas = mockLista();

    renderLista({ perfil: 'GESTOR', situacao: 'inativos' });

    await screen.findByRole('link', { name: 'Maria Silva' });
    expect(buscas[0]?.get('perfil')).toBe('GESTOR');
    expect(buscas[0]?.get('ativo')).toBe('false');
  });

  it('mudar o filtro vai para a URL', async () => {
    mockLista();
    const user = userEvent.setup();
    renderLista();

    await screen.findByRole('link', { name: 'Maria Silva' });
    await user.selectOptions(screen.getByLabelText('Situação'), 'ativos');

    await waitFor(() =>
      expect(window.location.search).toBe('?situacao=ativos'),
    );
  });

  it('desativa depois de confirmar', async () => {
    mockLista();
    const desativados: string[] = [];
    server.use(
      mswHttp.post('*/v1/usuarios/:id/desativar', ({ params }) => {
        desativados.push(String(params.id));
        return HttpResponse.json({ ...MARIA, ativo: false });
      }),
    );
    const user = userEvent.setup();
    renderLista();

    await user.click(
      await screen.findByRole('button', { name: 'Desativar Maria Silva' }),
    );
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Desativar usuário',
      }),
    );

    await waitFor(() => expect(desativados).toEqual([MARIA.id]));
    expect(await screen.findByText('Usuário desativado')).toBeInTheDocument();
  });

  it('o último administrador não é desativado, e a confirmação mostra o motivo', async () => {
    mockLista();
    const motivo = 'Não é possível desativar o último administrador ativo';
    server.use(
      mswHttp.post('*/v1/usuarios/:id/desativar', () =>
        erro(409, 'ULTIMO_ADMINISTRADOR', motivo),
      ),
    );
    const user = userEvent.setup();
    renderLista();

    await user.click(
      await screen.findByRole('button', { name: 'Desativar Maria Silva' }),
    );
    const dialogo = await screen.findByRole('dialog');
    await user.click(
      within(dialogo).getByRole('button', { name: 'Desativar usuário' }),
    );

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(motivo);
  });

  it('ativa direto, sem confirmação', async () => {
    mockLista();
    const ativados: string[] = [];
    server.use(
      mswHttp.post('*/v1/usuarios/:id/ativar', ({ params }) => {
        ativados.push(String(params.id));
        return HttpResponse.json({ ...INATIVO, ativo: true });
      }),
    );
    const user = userEvent.setup();
    renderLista();

    await user.click(
      await screen.findByRole('button', { name: 'Ativar João Souza' }),
    );

    await waitFor(() => expect(ativados).toEqual([INATIVO.id]));
    expect(await screen.findByText('Usuário ativado')).toBeInTheDocument();
  });

  it('mostra a lista vazia com a ação de cadastrar', async () => {
    mockLista([]);

    renderLista();

    expect(
      await screen.findByText('Nenhum usuário cadastrado'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo usuário' })).toHaveAttribute(
      'href',
      '/usuarios/novo',
    );
  });

  it('mostra o erro da busca e permite tentar de novo', async () => {
    server.use(
      mswHttp.get('*/v1/usuarios', () =>
        erro(500, 'ERRO_INTERNO', 'Internal server error'),
      ),
    );

    renderLista();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument();
  });
});

describe('NovoUsuarioForm', () => {
  beforeEach(() => {
    setTestUrl('/usuarios/novo');
  });

  async function preencher(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^Nome/), 'Maria Silva');
    await user.type(screen.getByLabelText(/^E-mail/), 'maria@exemplo.com');
    await user.selectOptions(screen.getByLabelText(/^Perfil/), 'COMERCIAL');
    await user.type(screen.getByLabelText(/^Senha inicial/), 'senha-inicial-1');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
  }

  it('cadastra e volta à lista', async () => {
    const corpos: unknown[] = [];
    server.use(
      mswHttp.post('*/v1/usuarios', async ({ request }) => {
        corpos.push(await request.json());
        return HttpResponse.json(MARIA, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderTela(<NovoUsuarioForm />);

    await preencher(user);

    await waitFor(() => expect(window.location.pathname).toBe('/usuarios'));
    expect(corpos).toEqual([
      {
        nome: 'Maria Silva',
        email: 'maria@exemplo.com',
        perfil: 'COMERCIAL',
        senha: 'senha-inicial-1',
      },
    ]);
  });

  it('valida antes de chamar a API', async () => {
    const corpos: unknown[] = [];
    server.use(
      mswHttp.post('*/v1/usuarios', () => {
        corpos.push(true);
        return HttpResponse.json(MARIA, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderTela(<NovoUsuarioForm />);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
    expect(screen.getByText('Informe o e-mail')).toBeInTheDocument();
    expect(screen.getByText('Selecione o perfil')).toBeInTheDocument();
    expect(screen.getByText('Use pelo menos 8 caracteres')).toBeInTheDocument();
    expect(corpos).toEqual([]);
  });

  it('mostra o e-mail duplicado no campo', async () => {
    const motivo = 'E-mail já cadastrado';
    server.use(
      mswHttp.post('*/v1/usuarios', () =>
        erro(409, 'USUARIO_EMAIL_DUPLICADO', motivo),
      ),
    );
    const user = userEvent.setup();
    renderTela(<NovoUsuarioForm />);

    await preencher(user);

    expect(await screen.findByText(motivo)).toBeInTheDocument();
    expect(screen.getByLabelText(/^E-mail/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});

describe('EditarUsuario', () => {
  beforeEach(() => {
    setTestUrl(`/usuarios/${MARIA.id}/editar`);
  });

  function mockDetalhe() {
    server.use(
      http.get('/v1/usuarios/{id}', ({ response }) =>
        response(200).json(MARIA),
      ),
    );
  }

  it('preenche os campos, sem senha, e salva o perfil novo', async () => {
    mockDetalhe();
    const corpos: unknown[] = [];
    server.use(
      mswHttp.patch('*/v1/usuarios/:id', async ({ request }) => {
        corpos.push(await request.json());
        return HttpResponse.json(MARIA);
      }),
    );
    const user = userEvent.setup();
    renderTela(<EditarUsuario id={MARIA.id} />);

    expect(screen.getByLabelText('Carregando usuário')).toBeInTheDocument();
    expect(await screen.findByLabelText(/^Nome/)).toHaveValue('Maria Silva');
    expect(screen.queryByLabelText(/Senha/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/^Perfil/), 'GESTOR');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(window.location.pathname).toBe('/usuarios'));
    expect(corpos).toEqual([
      { nome: 'Maria Silva', email: 'maria@exemplo.com', perfil: 'GESTOR' },
    ]);
  });

  it('rebaixar o último administrador mostra o motivo no perfil', async () => {
    mockDetalhe();
    const motivo = 'Não é possível alterar o perfil do último administrador';
    server.use(
      mswHttp.patch('*/v1/usuarios/:id', () =>
        erro(409, 'ULTIMO_ADMINISTRADOR', motivo),
      ),
    );
    const user = userEvent.setup();
    renderTela(<EditarUsuario id={MARIA.id} />);

    await user.selectOptions(await screen.findByLabelText(/^Perfil/), 'GESTOR');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(motivo)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Perfil/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('avisa quando o usuário não existe', async () => {
    server.use(
      mswHttp.get('*/v1/usuarios/:id', () =>
        erro(404, 'USUARIO_NAO_ENCONTRADO', 'Usuário não encontrado'),
      ),
    );

    renderTela(<EditarUsuario id={MARIA.id} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Usuário não encontrado',
    );
    expect(
      screen.getByRole('link', { name: 'Voltar aos usuários' }),
    ).toBeInTheDocument();
  });

  it('em uma falha temporária, permite tentar de novo', async () => {
    server.use(
      mswHttp.get('*/v1/usuarios/:id', () =>
        erro(500, 'ERRO_INTERNO', 'Internal server error'),
      ),
    );

    renderTela(<EditarUsuario id={MARIA.id} />);

    expect(
      await screen.findByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument();
  });
});
