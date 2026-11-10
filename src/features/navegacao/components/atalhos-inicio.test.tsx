import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Perfil } from '@/shared/auth/permissoes';
import { http } from '@/test/http';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { agruparItens, ITENS_MENU } from '../menu';
import { AtalhosInicio } from './atalhos-inicio';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

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

describe('AtalhosInicio', () => {
  it('Consulta vê só o permitido, sem atalho para a própria tela inicial', async () => {
    mockPerfil('CONSULTA');

    renderWithQuery(<AtalhosInicio />);

    await screen.findByRole('link', { name: /Mapa/ });
    expect(
      screen.getAllByRole('link').map((link) => link.getAttribute('href')),
    ).toEqual(['/mapa/geografico', '/loteamentos', '/lotes']);
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Geral', 'Cadastros']);
  });

  it('Administrador vê todas as áreas, com grupo e descrição', async () => {
    mockPerfil('ADMINISTRADOR');

    renderWithQuery(<AtalhosInicio />);

    expect(
      await screen.findByRole('link', { name: /Usuários.*Contas e perfis/ }),
    ).toHaveAttribute('href', '/usuarios');
    expect(
      screen.getByRole('region', { name: 'Administração' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(ITENS_MENU.length - 1);
  });
});

describe('agruparItens', () => {
  it('mantém a ordem dos grupos e deixa de fora os vazios', () => {
    const itens = ITENS_MENU.filter((item) =>
      ['Usuários', 'Mapa'].includes(item.label),
    );

    expect(agruparItens(itens).map(({ grupo }) => grupo)).toEqual([
      'Geral',
      'Administração',
    ]);
  });
});
