import { describe, expect, it } from 'vitest';
import { propostaFormSchema, toCreateProposta } from './proposta-form.schema';

describe('formulário de proposta', () => {
  it('preserva valor decimal e remove espaços sem arredondar', () => {
    expect(
      toCreateProposta(
        propostaFormSchema.parse({
          valor: '999999999999.99',
          condicoes: ' À vista ',
          observacoes: '',
        }),
      ),
    ).toEqual({
      valor: '999999999999.99',
      condicoes: 'À vista',
      observacoes: null,
    });
    expect(
      toCreateProposta(
        propostaFormSchema.parse({
          valor: '0.01',
          condicoes: 'Sinal',
          observacoes: ' Observação ',
        }),
      ).observacoes,
    ).toBe('Observação');
  });
  it.each(['', '0.00', '-1.00', '1.001', '1000000000000.00'])(
    'recusa valor inválido %s',
    (valor) => {
      expect(
        propostaFormSchema.safeParse({
          valor,
          condicoes: 'À vista',
          observacoes: '',
        }).success,
      ).toBe(false);
    },
  );
  it('exige condições e respeita os limites de texto', () => {
    expect(
      propostaFormSchema.safeParse({
        valor: '1.00',
        condicoes: ' ',
        observacoes: '',
      }).success,
    ).toBe(false);
    expect(
      propostaFormSchema.safeParse({
        valor: '1.00',
        condicoes: 'x'.repeat(10001),
        observacoes: 'x'.repeat(10001),
      }).success,
    ).toBe(false);
  });
});
