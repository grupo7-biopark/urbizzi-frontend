import { describe, expect, it } from 'vitest';
import {
  loteEdicaoFormSchema,
  loteFormSchema,
  toCreateLote,
  toUpdateLote,
} from './lote-form.schema';
import { lotesSearchSchema, toListLotesQuery } from './lotes-search.schema';

const UUID = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';

const VALIDO = {
  loteamentoId: UUID,
  quadraId: UUID,
  numero: ' 12 ',
  areaM2: '360.00',
  valor: '250000.00',
  exibirValorPublico: true,
  observacoes: ' Esquina ',
};

function mensagem(campos: Partial<typeof VALIDO>) {
  return loteFormSchema.safeParse({ ...VALIDO, ...campos }).error?.issues[0]
    ?.message;
}

describe('loteFormSchema', () => {
  it('tira os espaços das pontas', () => {
    expect(loteFormSchema.parse(VALIDO)).toMatchObject({
      numero: '12',
      observacoes: 'Esquina',
    });
  });

  it.each([
    [{ loteamentoId: '' }, 'Selecione o loteamento'],
    [{ quadraId: '' }, 'Selecione a quadra'],
    [{ numero: '  ' }, 'Informe o número'],
    [{ numero: 'x'.repeat(21) }, 'Use até 20 caracteres'],
    [{ areaM2: '' }, 'Informe a área'],
    [{ areaM2: '12345678901.00' }, 'Use até 10 dígitos antes da vírgula'],
    [{ valor: '1234567890123.00' }, 'Use até 12 dígitos antes da vírgula'],
  ])('recusa %j', (campos, esperada) => {
    expect(mensagem(campos)).toBe(esperada);
  });

  it('aceita o valor em branco e os maiores valores da API', () => {
    expect(mensagem({ valor: '' })).toBeUndefined();
    expect(
      mensagem({ areaM2: '1234567890.00', valor: '123456789012.00' }),
    ).toBeUndefined();
  });
});

describe('conversão para a API', () => {
  it('na criação, envia a quadra e deixa de fora o loteamento', () => {
    expect(toCreateLote(loteFormSchema.parse(VALIDO))).toEqual({
      quadraId: UUID,
      numero: '12',
      areaM2: '360.00',
      valor: '250000.00',
      exibirValorPublico: true,
      observacoes: 'Esquina',
    });
  });

  it('na edição, envia `null` para limpar os opcionais e não envia a quadra', () => {
    expect(
      toUpdateLote(
        loteEdicaoFormSchema.parse({
          numero: '12',
          areaM2: '360.00',
          valor: '',
          exibirValorPublico: false,
          observacoes: '',
        }),
      ),
    ).toEqual({
      numero: '12',
      areaM2: '360.00',
      valor: null,
      exibirValorPublico: false,
      observacoes: null,
    });
  });
});

describe('lotesSearchSchema', () => {
  it('lê os filtros da URL', () => {
    expect(
      lotesSearchSchema.parse({
        page: '2',
        q: ' 12 ',
        status: 'RESERVADO',
        loteamentoId: UUID,
        quadraId: UUID,
      }),
    ).toEqual({
      page: 2,
      pageSize: 20,
      q: '12',
      status: 'RESERVADO',
      loteamentoId: UUID,
      quadraId: UUID,
    });
  });

  it('não derruba a tela com uma URL editada à mão', () => {
    expect(
      lotesSearchSchema.parse({
        page: 'x',
        status: 'INEXISTENTE',
        loteamentoId: 'abc',
        quadraId: 'abc',
      }),
    ).toEqual({ page: 1, pageSize: 20 });
  });

  it('envia o status à API como lista, e só quando há filtro', () => {
    expect(
      toListLotesQuery({ page: 1, pageSize: 20, status: 'VENDIDO' }).status,
    ).toEqual(['VENDIDO']);
    expect(toListLotesQuery({ page: 1, pageSize: 20 })).not.toHaveProperty(
      'status',
    );
  });
});
