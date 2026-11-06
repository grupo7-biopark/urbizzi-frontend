import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { components } from '@/shared/api/schema';
import { http } from '@/test/http';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { Permitido } from './permitido';

type UsuarioLogado = components['schemas']['UsuarioLogadoDto'];

const USUARIO_ID = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';

function mockUsuario(perfil: UsuarioLogado['perfil']) {
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json({
        id: USUARIO_ID,
        nome: 'Pessoa Teste',
        email: 'pessoa@exemplo.com',
        perfil,
      }),
    ),
  );
}

describe('Permitido', () => {
  it('mostra a ação para quem pode', async () => {
    mockUsuario('GESTOR');

    renderWithQuery(<Permitido acao="marcarVendido">Marcar vendido</Permitido>);

    expect(await screen.findByText('Marcar vendido')).toBeInTheDocument();
  });

  it('não mostra nada enquanto o usuário carrega nem para quem não pode', async () => {
    mockUsuario('COMERCIAL');

    renderWithQuery(
      <>
        <Permitido acao="marcarVendido">Marcar vendido</Permitido>
        <Permitido acao="gerarLinkPublico">Gerar link</Permitido>
      </>,
    );

    expect(screen.queryByText('Gerar link')).not.toBeInTheDocument();
    expect(await screen.findByText('Gerar link')).toBeInTheDocument();
    expect(screen.queryByText('Marcar vendido')).not.toBeInTheDocument();
  });

  it('confere o dono nas ações permitidas só para os próprios registros', async () => {
    mockUsuario('COMERCIAL');

    renderWithQuery(
      <>
        <Permitido acao="gerenciarReservas" donoId={USUARIO_ID}>
          Minha reserva
        </Permitido>
        <Permitido acao="gerenciarReservas" donoId="outro-vendedor">
          Reserva de outro vendedor
        </Permitido>
      </>,
    );

    expect(await screen.findByText('Minha reserva')).toBeInTheDocument();
    expect(
      screen.queryByText('Reserva de outro vendedor'),
    ).not.toBeInTheDocument();
  });
});
