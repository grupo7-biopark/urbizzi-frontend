import { describe, expect, it } from 'vitest';
import { quadrasSearchSchema } from './loteamentos-search.schema';
import { quadraFormSchema } from './quadra-form.schema';

describe('quadraFormSchema', () => {
  it('tira os espaços das pontas', () => {
    expect(quadraFormSchema.parse({ numero: '  A1 ' })).toEqual({
      numero: 'A1',
    });
  });

  it('exige o número', () => {
    const { error } = quadraFormSchema.safeParse({ numero: '   ' });

    expect(error?.issues[0]?.message).toBe('Informe o número');
  });

  it('aceita até 20 caracteres', () => {
    expect(quadraFormSchema.safeParse({ numero: 'x'.repeat(20) }).success).toBe(
      true,
    );

    const { error } = quadraFormSchema.safeParse({ numero: 'x'.repeat(21) });

    expect(error?.issues[0]?.message).toBe('Use até 20 caracteres');
  });
});

describe('quadrasSearchSchema', () => {
  it('lê a página e ignora o que não é da lista', () => {
    expect(quadrasSearchSchema.parse({ page: '3', q: 'x' })).toEqual({
      page: 3,
      pageSize: 20,
    });
  });

  it('não derruba a tela com uma URL editada à mão', () => {
    expect(quadrasSearchSchema.parse({ page: 'abc' }).page).toBe(1);
  });
});
