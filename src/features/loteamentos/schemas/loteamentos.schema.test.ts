import { describe, expect, it } from 'vitest';
import {
  loteamentoFormSchema,
  toLoteamentoBody,
} from './loteamento-form.schema';
import {
  loteamentoIdSchema,
  loteamentosSearchSchema,
} from './loteamentos-search.schema';

const VALIDO = { nome: 'Bela Vista', descricao: '', localizacao: '' };

function erroDe(valores: typeof VALIDO) {
  const resultado = loteamentoFormSchema.safeParse(valores);
  return resultado.success ? undefined : resultado.error.issues[0]?.message;
}

describe('loteamentoFormSchema', () => {
  it('aceita só o nome e remove os espaços das pontas', () => {
    expect(
      loteamentoFormSchema.parse({ ...VALIDO, nome: '  Bela Vista  ' }).nome,
    ).toBe('Bela Vista');
  });

  it('exige o nome, mesmo só com espaços', () => {
    expect(erroDe({ ...VALIDO, nome: '   ' })).toBe('Informe o nome');
  });

  it('respeita os limites do backend', () => {
    expect(erroDe({ ...VALIDO, nome: 'a'.repeat(150) })).toBeUndefined();
    expect(erroDe({ ...VALIDO, nome: 'a'.repeat(151) })).toBe(
      'Use até 150 caracteres',
    );
    expect(erroDe({ ...VALIDO, localizacao: 'a'.repeat(255) })).toBeUndefined();
    expect(erroDe({ ...VALIDO, localizacao: 'a'.repeat(256) })).toBe(
      'Use até 255 caracteres',
    );
  });
});

describe('toLoteamentoBody', () => {
  it('envia campo opcional vazio como null', () => {
    expect(toLoteamentoBody(VALIDO)).toEqual({
      nome: 'Bela Vista',
      descricao: null,
      localizacao: null,
    });
  });

  it('mantém os campos preenchidos', () => {
    const valores = { nome: 'A', descricao: 'B', localizacao: 'C' };

    expect(toLoteamentoBody(valores)).toEqual(valores);
  });
});

describe('loteamentosSearchSchema', () => {
  it('lê os valores da URL', () => {
    expect(
      loteamentosSearchSchema.parse({ page: '2', pageSize: '50', q: 'bela' }),
    ).toEqual({ page: 2, pageSize: 50, q: 'bela' });
  });

  it.each([
    [{}],
    [{ page: 'abc', pageSize: '9999', q: '   ' }],
    [{ page: '0', pageSize: '-1', q: ['a', 'b'] }],
  ])('cai nos padrões com a URL inválida: %j', (url) => {
    expect(loteamentosSearchSchema.parse(url)).toEqual({
      page: 1,
      pageSize: 20,
    });
  });
});

describe('loteamentoIdSchema', () => {
  it('aceita só UUID', () => {
    expect(
      loteamentoIdSchema.safeParse('0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10')
        .success,
    ).toBe(true);
    expect(loteamentoIdSchema.safeParse('novo-loteamento').success).toBe(false);
  });
});
