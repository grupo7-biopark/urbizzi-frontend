import { forbidden } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/errors';
import { exigirPermissao, tratarAcessoNegado } from './permissao.server';
import type { Perfil } from './permissoes';
import { getUsuarioAtual } from './usuario-atual.server';

vi.mock('server-only', () => ({}));
vi.mock('./usuario-atual.server', () => ({
  getUsuarioAtual: vi.fn<() => Promise<unknown>>(),
}));
vi.mock('next/navigation', () => ({
  // Como o de verdade, interrompe quem chamou.
  forbidden: vi.fn<() => never>(() => {
    throw new Error('FORBIDDEN');
  }),
}));

function mockPerfil(perfil: Perfil) {
  const usuario = {
    id: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    nome: 'Pessoa Teste',
    email: 'pessoa@exemplo.com',
    perfil,
  };
  vi.mocked(getUsuarioAtual).mockResolvedValue(usuario);
  return usuario;
}

function apiError(statusCode: number, code: string) {
  return new ApiError({ statusCode, code, message: 'Mensagem' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('exigirPermissao', () => {
  it('devolve o usuário quando o perfil pode', async () => {
    const usuario = mockPerfil('ADMINISTRADOR');

    await expect(exigirPermissao('gerenciarUsuarios')).resolves.toEqual(
      usuario,
    );
    expect(forbidden).not.toHaveBeenCalled();
  });

  it('interrompe quando o perfil não pode', async () => {
    mockPerfil('CONSULTA');

    await expect(exigirPermissao('gerenciarUsuarios')).rejects.toThrow(
      'FORBIDDEN',
    );
    expect(forbidden).toHaveBeenCalledOnce();
  });

  it('confere o dono do registro', async () => {
    mockPerfil('COMERCIAL');

    await expect(
      exigirPermissao('gerenciarReservas', { donoId: 'outro-vendedor' }),
    ).rejects.toThrow('FORBIDDEN');
  });
});

describe('tratarAcessoNegado', () => {
  it('devolve o resultado da busca', async () => {
    await expect(tratarAcessoNegado(Promise.resolve('dados'))).resolves.toBe(
      'dados',
    );
  });

  it('transforma o 403 da API na tela 403', async () => {
    await expect(
      tratarAcessoNegado(Promise.reject(apiError(403, 'ACESSO_NEGADO'))),
    ).rejects.toThrow('FORBIDDEN');
    expect(forbidden).toHaveBeenCalledOnce();
  });

  it('repassa os outros erros', async () => {
    const erro = apiError(500, 'ERRO_INTERNO');

    await expect(tratarAcessoNegado(Promise.reject(erro))).rejects.toBe(erro);
    expect(forbidden).not.toHaveBeenCalled();
  });
});
