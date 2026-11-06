import { describe, expect, it } from 'vitest';
import {
  recuperarSenhaSchema,
  redefinirSenhaSchema,
  tokenRecuperacaoSchema,
} from './recuperacao-senha.schema';

function erroDaSenha(senha: string, confirmacao = senha) {
  return redefinirSenhaSchema.safeParse({ senha, confirmacao }).error?.issues[0]
    ?.message;
}

describe('recuperarSenhaSchema', () => {
  it('tira os espaços das pontas', () => {
    expect(recuperarSenhaSchema.parse({ email: ' a@exemplo.com ' })).toEqual({
      email: 'a@exemplo.com',
    });
  });

  it.each([
    ['', 'Informe o e-mail'],
    ['sem-arroba', 'Informe um e-mail válido'],
    [`${'a'.repeat(250)}@b.co`, 'Use até 254 caracteres'],
  ])('recusa %j', (email, mensagem) => {
    expect(
      recuperarSenhaSchema.safeParse({ email }).error?.issues[0]?.message,
    ).toBe(mensagem);
  });
});

describe('redefinirSenhaSchema', () => {
  it('aceita de 8 a 1024 caracteres', () => {
    expect(erroDaSenha('x'.repeat(8))).toBeUndefined();
    expect(erroDaSenha('x'.repeat(1024))).toBeUndefined();
  });

  it('recusa fora dos limites', () => {
    expect(erroDaSenha('x'.repeat(7))).toBe('Use pelo menos 8 caracteres');
    expect(erroDaSenha('x'.repeat(1025))).toBe('Use até 1024 caracteres');
  });

  it('exige a confirmação igual, com o erro no campo dela', () => {
    const { error } = redefinirSenhaSchema.safeParse({
      senha: 'senha-nova-123',
      confirmacao: 'outra-senha-123',
    });

    expect(error?.issues[0]).toMatchObject({
      message: 'As senhas não são iguais',
      path: ['confirmacao'],
    });
  });

  it('exige a confirmação preenchida', () => {
    expect(erroDaSenha('senha-nova-123', '')).toBe('Repita a nova senha');
  });

  it('não altera a senha: espaços fazem parte dela', () => {
    expect(
      redefinirSenhaSchema.parse({
        senha: ' senha nova ',
        confirmacao: ' senha nova ',
      }).senha,
    ).toBe(' senha nova ');
  });
});

describe('tokenRecuperacaoSchema', () => {
  it('aceita o formato da API', () => {
    expect(tokenRecuperacaoSchema.safeParse('A'.repeat(43)).success).toBe(true);
  });

  it.each(['', 'curto', 'A'.repeat(44), `${'A'.repeat(42)}!`])(
    'recusa %j',
    (token) => {
      expect(tokenRecuperacaoSchema.safeParse(token).success).toBe(false);
    },
  );
});
