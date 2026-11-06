import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import { RecuperarSenha } from './recuperar-senha';
import { RedefinirSenha } from './redefinir-senha';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const TOKEN = 'A'.repeat(43);
const FORGOT = '*/v1/auth/forgot-password';
const RESET = '*/v1/auth/reset-password';

function renderTela(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function erro(statusCode: number, code: string, message: string) {
  return HttpResponse.json(makeErrorResponse({ statusCode, code, message }), {
    status: statusCode,
  });
}

describe('RecuperarSenha', () => {
  beforeEach(() => {
    setTestUrl('/recuperar-senha');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = renderTela(<RecuperarSenha />);

    await expectNoA11yViolations(container);
  });

  it('valida o e-mail antes de chamar a API', async () => {
    const chamadas: unknown[] = [];
    server.use(
      http.post(FORGOT, () => {
        chamadas.push(true);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderTela(<RecuperarSenha />);

    await user.type(screen.getByLabelText(/E-mail/), 'sem-arroba');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(
      await screen.findByText('Informe um e-mail válido'),
    ).toBeInTheDocument();
    expect(chamadas).toEqual([]);
  });

  it('envia o e-mail e mostra a mensagem, sem dizer se a conta existe', async () => {
    const corpos: unknown[] = [];
    server.use(
      http.post(FORGOT, async ({ request }) => {
        corpos.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderTela(<RecuperarSenha />);

    await user.type(screen.getByLabelText(/E-mail/), 'a@exemplo.com');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Se este e-mail estiver cadastrado',
    );
    expect(corpos).toEqual([{ email: 'a@exemplo.com' }]);
    expect(
      screen.getByRole('link', { name: 'Voltar para o login' }),
    ).toHaveAttribute('href', '/login');
  });

  it('em uma falha, avisa e mantém o formulário', async () => {
    server.use(
      http.post(FORGOT, () =>
        erro(429, 'MUITAS_REQUISICOES', 'Too many requests'),
      ),
    );
    const user = userEvent.setup();
    renderTela(<RecuperarSenha />);

    await user.type(screen.getByLabelText(/E-mail/), 'a@exemplo.com');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas tentativas',
    );
    expect(screen.getByLabelText(/E-mail/)).toHaveValue('a@exemplo.com');
  });
});

describe('RedefinirSenha', () => {
  beforeEach(() => {
    setTestUrl(`/redefinir-senha?token=${TOKEN}`);
    // O simulador do Next não muda a URL de verdade: o token começa nela.
    window.history.replaceState(null, '', `/redefinir-senha?token=${TOKEN}`);
  });

  async function preencher(
    user: ReturnType<typeof userEvent.setup>,
    senha = 'senha-nova-123',
    confirmacao = senha,
  ) {
    await user.type(screen.getByLabelText(/^Nova senha/), senha);
    await user.type(screen.getByLabelText(/Repita a nova senha/), confirmacao);
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));
  }

  it('tira o token da URL e mostra as regras, sem violações', async () => {
    const { container } = renderTela(<RedefinirSenha token={TOKEN} />);

    expect(window.location.search).toBe('');
    expect(window.location.pathname).toBe('/redefinir-senha');
    expect(screen.getByText('Use de 8 a 1024 caracteres.')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('valida as senhas antes de chamar a API', async () => {
    const chamadas: unknown[] = [];
    server.use(
      http.post(RESET, () => {
        chamadas.push(true);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderTela(<RedefinirSenha token={TOKEN} />);

    await preencher(user, 'curta', 'curta');
    expect(
      await screen.findByText('Use pelo menos 8 caracteres'),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/^Nova senha/));
    await user.clear(screen.getByLabelText(/Repita a nova senha/));
    await preencher(user, 'senha-nova-123', 'senha-outra-123');

    expect(
      await screen.findByText('As senhas não são iguais'),
    ).toBeInTheDocument();
    expect(chamadas).toEqual([]);
  });

  it('envia o token e a senha, sem a confirmação, e leva ao login', async () => {
    const corpos: unknown[] = [];
    server.use(
      http.post(RESET, async ({ request }) => {
        corpos.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderTela(<RedefinirSenha token={TOKEN} />);

    await preencher(user);

    expect(
      await screen.findByRole('heading', { name: 'Senha redefinida' }),
    ).toBeInTheDocument();
    expect(corpos).toEqual([{ token: TOKEN, senha: 'senha-nova-123' }]);
    expect(
      screen.getByRole('link', { name: 'Ir para o login' }),
    ).toHaveAttribute('href', '/login');
  });

  it('sem token válido, avisa e oferece outro link, sem chamar a API', () => {
    renderTela(<RedefinirSenha token={null} />);

    expect(screen.getByRole('alert')).toHaveTextContent('expirou');
    expect(
      screen.getByRole('link', { name: 'Pedir outro link' }),
    ).toHaveAttribute('href', '/recuperar-senha');
    expect(screen.queryByLabelText(/^Nova senha/)).not.toBeInTheDocument();
  });

  it('com o token expirado na API, troca o formulário pelo aviso', async () => {
    server.use(
      http.post(RESET, () =>
        erro(
          401,
          'TOKEN_RECUPERACAO_INVALIDO',
          'Token de recuperação inválido ou expirado',
        ),
      ),
    );
    const user = userEvent.setup();
    renderTela(<RedefinirSenha token={TOKEN} />);

    await preencher(user);

    expect(
      await screen.findByRole('heading', { name: 'Link inválido' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Pedir outro link' }),
    ).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('em outra falha, mantém o formulário e mostra o motivo', async () => {
    server.use(
      http.post(RESET, () =>
        erro(500, 'ERRO_INTERNO', 'Internal server error'),
      ),
    );
    const user = userEvent.setup();
    renderTela(<RedefinirSenha token={TOKEN} />);

    await preencher(user);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível concluir a operação',
      ),
    );
    expect(screen.getByLabelText(/^Nova senha/)).toBeInTheDocument();
  });

  it('mostra no campo o erro de validação da API', async () => {
    server.use(
      http.post(RESET, () =>
        HttpResponse.json(
          makeErrorResponse({
            statusCode: 400,
            code: 'DADOS_INVALIDOS',
            message: 'Dados inválidos',
            details: [{ field: 'senha', messages: ['Senha muito fraca'] }],
          }),
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderTela(<RedefinirSenha token={TOKEN} />);

    await preencher(user);

    expect(await screen.findByText('Senha muito fraca')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nova senha/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
