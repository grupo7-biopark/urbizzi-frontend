import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { navigateTo } from '@/shared/auth/navigation';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { http } from '@/test/http';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { LoginForm } from './login-form';

vi.mock('@/shared/auth/navigation', () => ({
  navigateTo: vi.fn<() => void>(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

async function enviar(email: string, senha: string) {
  const user = userEvent.setup();
  renderWithQuery(<LoginForm redirectTo="/lotes" />);

  if (email) {
    await user.type(screen.getByLabelText(/E-mail/), email);
  }
  if (senha) {
    await user.type(screen.getByLabelText(/Senha/), senha);
  }
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

function mockLoginError(status: number, code: string, details?: object[]) {
  server.use(
    http.untyped.post('*/api/auth/login', () =>
      HttpResponse.json(
        makeErrorResponse({
          statusCode: status,
          code,
          message: 'Mensagem da API',
          details: details as never,
        }),
        { status },
      ),
    ),
  );
}

describe('LoginForm', () => {
  it('entra e vai à página de destino', async () => {
    const corpos: unknown[] = [];
    server.use(
      http.untyped.post('*/api/auth/login', async ({ request }) => {
        corpos.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await enviar('pessoa@exemplo.com', 'senha-de-teste');

    await waitFor(() => expect(navigateTo).toHaveBeenCalledWith('/lotes'));
    expect(corpos).toEqual([
      { email: 'pessoa@exemplo.com', senha: 'senha-de-teste' },
    ]);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  });

  it('não chama a API com os campos vazios', async () => {
    await enviar('', '');

    expect(await screen.findByText('Informe o e-mail')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha')).toBeInTheDocument();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('mostra a mesma mensagem para senha errada e usuário inativo', async () => {
    mockLoginError(401, 'CREDENCIAIS_INVALIDAS');

    await enviar('pessoa@exemplo.com', 'senha-errada');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail ou senha incorretos, ou usuário inativo.',
    );
    expect(navigateTo).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('pede para aguardar no excesso de tentativas', async () => {
    mockLoginError(429, 'MUITAS_REQUISICOES');

    await enviar('pessoa@exemplo.com', 'senha');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas tentativas. Aguarde e tente novamente.',
    );
  });

  it('mostra embaixo do campo o erro de validação da API', async () => {
    mockLoginError(400, 'DADOS_INVALIDOS', [
      { field: 'email', messages: ['E-mail recusado'] },
      { field: 'senha', messages: ['Senha recusada'] },
    ]);

    await enviar('pessoa@exemplo.com', 'senha');

    expect(await screen.findByText('E-mail recusado')).toBeInTheDocument();
    expect(screen.getByText('Senha recusada')).toBeInTheDocument();
  });

  it('avisa quando o servidor está fora do ar', async () => {
    server.use(
      http.untyped.post('*/api/auth/login', () => HttpResponse.error()),
    );

    await enviar('pessoa@exemplo.com', 'senha');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao servidor',
    );
  });

  it('oferece o link de recuperação de senha', () => {
    renderWithQuery(<LoginForm redirectTo="/" />);

    expect(
      screen.getByRole('link', { name: 'Esqueci minha senha' }),
    ).toHaveAttribute('href', '/recuperar-senha');
  });
});
