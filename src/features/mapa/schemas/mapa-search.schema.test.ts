import { describe, expect, it } from 'vitest';
import { mapaSearchSchema, toConsultaMapa } from './mapa-search.schema';

const UUID = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';

describe('mapaSearchSchema', () => {
  it('lê os filtros da URL', () => {
    expect(
      mapaSearchSchema.parse({ loteamentoId: UUID, status: 'VENDIDO' }),
    ).toEqual({ loteamentoId: UUID, status: 'VENDIDO' });
  });

  it('não derruba a tela com uma URL editada à mão', () => {
    expect(
      mapaSearchSchema.parse({ loteamentoId: 'abc', status: 'APROVADA' }),
    ).toEqual({});
  });
});

describe('toConsultaMapa', () => {
  it('envia o status como lista', () => {
    expect(toConsultaMapa({ loteamentoId: UUID, status: 'VENDIDO' })).toEqual({
      loteamentoId: UUID,
      status: ['VENDIDO'],
    });
  });

  it('sem filtros, não envia nada', () => {
    expect(toConsultaMapa({})).toEqual({});
  });
});
