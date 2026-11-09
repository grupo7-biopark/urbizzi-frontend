import { describe, expect, it } from 'vitest';
import {
  configuracoesFormSchema,
  toConfiguracoesForm,
} from './configuracoes-form.schema';

function erroDaReserva(valor: string) {
  return configuracoesFormSchema.safeParse({
    prazoReservaDias: valor,
    prazoAnaliseDiasUteis: '7',
  }).error?.issues[0]?.message;
}

describe('configuracoesFormSchema', () => {
  it('converte o texto dos campos nos números que a API espera', () => {
    expect(
      configuracoesFormSchema.parse({
        prazoReservaDias: ' 10 ',
        prazoAnaliseDiasUteis: '3',
      }),
    ).toEqual({ prazoReservaDias: 10, prazoAnaliseDiasUteis: 3 });
  });

  it.each([
    ['', 'Informe o prazo da reserva'],
    ['0', 'Use pelo menos 1 dia'],
    ['-2', 'Use um número inteiro de dias'],
    ['1.5', 'Use um número inteiro de dias'],
    ['1,5', 'Use um número inteiro de dias'],
    ['dez', 'Use um número inteiro de dias'],
    ['99999999999999999', 'Use um número menor'],
  ])('recusa %j', (valor, mensagem) => {
    expect(erroDaReserva(valor)).toBe(mensagem);
  });

  it('aceita 1 dia', () => {
    expect(erroDaReserva('1')).toBeUndefined();
  });

  it('pede o prazo de análise com a mensagem dele', () => {
    expect(
      configuracoesFormSchema.safeParse({
        prazoReservaDias: '7',
        prazoAnaliseDiasUteis: '',
      }).error?.issues[0]?.message,
    ).toBe('Informe o prazo de análise');
  });
});

describe('toConfiguracoesForm', () => {
  it('leva os números da API para o texto dos campos', () => {
    expect(
      toConfiguracoesForm({ prazoReservaDias: 7, prazoAnaliseDiasUteis: 5 }),
    ).toEqual({ prazoReservaDias: '7', prazoAnaliseDiasUteis: '5' });
  });
});
