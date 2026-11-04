import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { components } from '@/shared/api/schema';
import { navigateTo } from '@/shared/auth/navigation';
import { http } from '@/test/http';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { UserMenu } from './user-menu';

vi.mock('@/shared/auth/navigation', () => ({
  navigateTo: vi.fn<() => void>(),
}));

const USUARIO: components['schemas']['UsuarioLogadoDto'] = {
  id: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
  nome: 'Pessoa Teste',
  email: 'pessoa@exemplo.com',
  perfil: 'COMERCIAL',
};

afterEach(() => {
  vi.clearAllMocks();
});

function mockUsuario() {
  server.use(
    http.get('/v1/auth/me', ({ response }) => response(200).json(USUARIO)),
  );
}

describe('UserMenu', () => {
  it('mostra o carregamento e depois o nome do usuário', async () => {
    mockUsuario();

    renderWithQuery(<UserMenu />);

    expect(screen.getByLabelText('Carregando usuário')).toBeInTheDocument();
    expect(await screen.findByText('Pessoa Teste')).toBeInTheDocument();
  });

  it('sai da conta e vai ao login', async () => {
    mockUsuario();
    server.use(
      http.untyped.post(
        '*/api/auth/logout',
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const user = userEvent.setup();
    renderWithQuery(<UserMenu />);

    await user.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(navigateTo).toHaveBeenCalledWith('/login'));
  });

  it('avisa quando não consegue sair', async () => {
    mockUsuario();
    server.use(
      http.untyped.post('*/api/auth/logout', () => HttpResponse.error()),
    );
    const user = userEvent.setup();
    renderWithQuery(<UserMenu />);

    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao servidor',
    );
    expect(navigateTo).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeEnabled();
  });
});
