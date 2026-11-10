import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Perfil } from '@/shared/auth/permissoes';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { getItemAtivo } from '../menu';
import { MenuCelular } from './menu-celular';
import { MenuNavegacao } from './menu-navegacao';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const TODOS_VEEM = ['Início', 'Mapa', 'Loteamentos', 'Lotes'];
const COMERCIAL = [
  ...TODOS_VEEM,
  'Clientes',
  'Reservas',
  'Propostas',
  'Links públicos',
  'Histórico',
];
const GESTOR = [
  ...TODOS_VEEM,
  'Plantas',
  'Clientes',
  'Reservas',
  'Propostas',
  'Pendências',
  'Links públicos',
  'Histórico',
];

function mockPerfil(perfil: Perfil) {
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json({
        id: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
        nome: 'Pessoa Teste',
        email: 'pessoa@exemplo.com',
        perfil,
      }),
    ),
  );
}

beforeEach(() => {
  setTestUrl('/');
});

describe('MenuNavegacao', () => {
  it.each<[Perfil, string[]]>([
    ['ADMINISTRADOR', [...GESTOR, 'Usuários', 'Configurações']],
    ['GESTOR', GESTOR],
    ['COMERCIAL', COMERCIAL],
    ['CONSULTA', TODOS_VEEM],
  ])('%s vê só os itens permitidos', async (perfil, esperados) => {
    mockPerfil(perfil);

    renderWithQuery(<MenuNavegacao />);

    await screen.findByRole('link', { name: 'Início' });
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(
      esperados,
    );
  });

  it('marca a tela atual pelo item mais específico', async () => {
    setTestUrl('/propostas/pendencias');
    mockPerfil('GESTOR');

    renderWithQuery(<MenuNavegacao />);

    expect(
      await screen.findByRole('link', { name: 'Pendências' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Propostas' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});

describe('getItemAtivo', () => {
  it.each([
    ['/', 'Início'],
    ['/loteamentos', 'Loteamentos'],
    ['/mapa', 'Mapa'],
    ['/mapa/geografico', 'Mapa'],
    ['/mapa/editor', 'Mapa'],
    ['/loteamentos/abc/quadras', 'Loteamentos'],
    ['/propostas', 'Propostas'],
    ['/propostas/pendencias', 'Pendências'],
  ])('em %s, é %s', (pathname, label) => {
    expect(getItemAtivo(pathname)?.label).toBe(label);
  });

  it('não confunde uma rota com outra de mesmo começo', () => {
    expect(getItemAtivo('/lotes-antigos')).toBeUndefined();
  });
});

describe('MenuCelular', () => {
  it('abre a gaveta e fecha ao escolher uma tela', async () => {
    mockPerfil('CONSULTA');
    const user = userEvent.setup();
    renderWithQuery(<MenuCelular />);

    await user.click(screen.getByRole('button', { name: 'Menu' }));

    const gaveta = await screen.findByRole('dialog', { name: 'Menu' });
    const link = await within(gaveta).findByRole('link', { name: 'Lotes' });
    // O jsdom não navega ao clicar em um link: importa só o fechamento.
    link.addEventListener('click', (event) => event.preventDefault());
    await user.click(link);

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});
