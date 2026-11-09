import { describe, expect, it } from 'vitest';
import {
  usuarioEdicaoFormSchema,
  usuarioFormSchema,
} from './usuario-form.schema';
import {
  toListUsuariosQuery,
  usuariosSearchSchema,
} from './usuarios-search.schema';

const VALIDO = {
  nome: ' Maria Silva ',
  email: ' maria@exemplo.com ',
  perfil: 'COMERCIAL',
  senha: 'senha-inicial-1',
};

function mensagem(campos: Partial<Record<keyof typeof VALIDO, string>>) {
  return usuarioFormSchema.safeParse({ ...VALIDO, ...campos }).error?.issues[0]
    ?.message;
}

describe('usuarioFormSchema', () => {
  it('tira os espaços do nome e do e-mail, e não da senha', () => {
    expect(
      usuarioFormSchema.parse({ ...VALIDO, senha: ' com espaço ' }),
    ).toEqual({
      nome: 'Maria Silva',
      email: 'maria@exemplo.com',
      perfil: 'COMERCIAL',
      senha: ' com espaço ',
    });
  });

  it.each([
    [{ nome: '  ' }, 'Informe o nome'],
    [{ nome: 'x'.repeat(151) }, 'Use até 150 caracteres'],
    [{ email: '' }, 'Informe o e-mail'],
    [{ email: 'sem-arroba' }, 'Informe um e-mail válido'],
    [{ perfil: '' }, 'Selecione o perfil'],
    [{ perfil: 'DONO' }, 'Selecione o perfil'],
    [{ senha: 'curta' }, 'Use pelo menos 8 caracteres'],
    [{ senha: 'x'.repeat(1025) }, 'Use até 1024 caracteres'],
  ])('recusa %j', (campos, esperada) => {
    expect(mensagem(campos)).toBe(esperada);
  });

  it('a edição não pede senha', () => {
    expect(
      usuarioEdicaoFormSchema.parse({
        nome: 'Maria',
        email: 'maria@exemplo.com',
        perfil: 'GESTOR',
      }),
    ).toEqual({ nome: 'Maria', email: 'maria@exemplo.com', perfil: 'GESTOR' });
  });
});

describe('usuariosSearchSchema', () => {
  it('lê os filtros da URL e envia a situação como booleano', () => {
    const search = usuariosSearchSchema.parse({
      page: '2',
      perfil: 'GESTOR',
      situacao: 'inativos',
    });

    expect(toListUsuariosQuery(search)).toEqual({
      page: 2,
      pageSize: 20,
      perfil: 'GESTOR',
      ativo: false,
    });
    expect(
      toListUsuariosQuery(usuariosSearchSchema.parse({ situacao: 'ativos' }))
        .ativo,
    ).toBe(true);
  });

  it('sem situação, não filtra', () => {
    expect(
      toListUsuariosQuery(usuariosSearchSchema.parse({})),
    ).not.toHaveProperty('ativo');
  });

  it('não derruba a tela com uma URL editada à mão', () => {
    expect(
      usuariosSearchSchema.parse({
        page: 'x',
        perfil: 'DONO',
        situacao: 'talvez',
      }),
    ).toEqual({ page: 1, pageSize: 20 });
  });
});
