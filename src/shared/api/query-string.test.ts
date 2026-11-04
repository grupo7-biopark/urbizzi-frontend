import { describe, expect, it } from 'vitest';
import { toQueryString } from './query-string';

describe('toQueryString', () => {
  it('monta filtro de igualdade, número e booleano', () => {
    expect(toQueryString({ q: 'bela', page: 2, ativo: false })).toBe(
      'q=bela&page=2&ativo=false',
    );
  });

  it('separa vários valores por vírgula', () => {
    expect(toQueryString({ status: ['DISPONIVEL', 'RESERVADO'] })).toBe(
      'status=DISPONIVEL,RESERVADO',
    );
  });

  it('omite filtros sem valor', () => {
    expect(
      toQueryString({
        q: '',
        status: [],
        vazios: ['', undefined],
        quadraId: undefined,
        dataVencimentoDe: null,
      }),
    ).toBe('');
  });

  it('mantém os valores falsos que são filtros de verdade', () => {
    expect(toQueryString({ ativo: false, minimo: 0 })).toBe(
      'ativo=false&minimo=0',
    );
  });

  it('codifica caracteres especiais', () => {
    expect(toQueryString({ q: 'são & cia', tags: ['a,b', 'c d'] })).toBe(
      'q=s%C3%A3o%20%26%20cia&tags=a%2Cb,c%20d',
    );
  });

  it('ignora valores que a API não aceita na query', () => {
    expect(toQueryString({ filtro: { a: 1 } })).toBe('');
  });
});
