import { expect, it } from 'vitest';
import { decisaoPropostaSchema } from './decisao-proposta.schema';

it.each(['aprovar', 'rejeitar'])(
  'exige motivo e normaliza o texto ao %s',
  (decisao) => {
    expect(
      decisaoPropostaSchema.parse({ decisao, motivo: '  Análise concluída  ' }),
    ).toEqual({
      decisao,
      motivo: 'Análise concluída',
    });
    expect(
      decisaoPropostaSchema.safeParse({ decisao, motivo: '   ' }).success,
    ).toBe(false);
    expect(
      decisaoPropostaSchema.safeParse({ decisao, motivo: 'a'.repeat(10001) })
        .success,
    ).toBe(false);
  },
);

it('exige uma decisão explícita', () => {
  expect(
    decisaoPropostaSchema.safeParse({ decisao: '', motivo: 'Motivo' }).success,
  ).toBe(false);
});
