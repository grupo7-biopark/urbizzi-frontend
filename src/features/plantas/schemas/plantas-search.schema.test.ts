import { describe, expect, it } from 'vitest';
import { plantasSearchSchema } from './plantas-search.schema';

describe('plantasSearchSchema', () => {
  it('usa a primeira página por padrão', () => {
    expect(plantasSearchSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('lê os valores da URL', () => {
    expect(plantasSearchSchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it('ignora valores inválidos', () => {
    expect(plantasSearchSchema.parse({ page: 'x', pageSize: '1000' })).toEqual({
      page: 1,
      pageSize: 20,
    });
  });
});
