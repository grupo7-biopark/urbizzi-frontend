import { describe, expect, it } from 'vitest';
import {
  periodoInvertido,
  reservasSearchSchema,
  toListReservasQuery,
} from './reservas-search.schema';

describe('filtros de reservas', () => {
  it('recupera paginação e filtros inválidos sem quebrar a tela', () => {
    expect(
      reservasSearchSchema.parse({
        page: -1,
        pageSize: 101,
        minhas: 'x',
        status: 'VENDIDA',
        vendedorId: 'nome',
        loteamentoId: 'x',
        vencimentoDe: '2026-02-30',
        vencimentoAte: 'x',
      }),
    ).toEqual({ page: 1, pageSize: 20, minhas: 'false' });
  });
  it('converte filtros e preserva os extremos inclusivos no fuso local', () => {
    const search = reservasSearchSchema.parse({
      page: '2',
      pageSize: '10',
      status: 'ATIVA',
      vendedorId: '6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
      loteamentoId: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
      vencimentoDe: '2026-11-09',
      vencimentoAte: '2026-11-10',
    });
    expect(toListReservasQuery(search, false)).toEqual({
      page: 2,
      pageSize: 10,
      status: ['ATIVA'],
      vendedorId: search.vendedorId,
      loteamentoId: search.loteamentoId,
      vencimentoDe: new Date(2026, 10, 9).toISOString(),
      vencimentoAte: new Date(2026, 10, 10, 23, 59, 59, 999).toISOString(),
    });
    expect(toListReservasQuery(search, true)).not.toHaveProperty('vendedorId');
    expect(periodoInvertido(search)).toBe(false);
  });
  it('detecta período invertido, aceita um extremo ou nenhum', () => {
    expect(
      periodoInvertido(
        reservasSearchSchema.parse({
          vencimentoDe: '2026-11-10',
          vencimentoAte: '2026-11-09',
        }),
      ),
    ).toBe(true);
    expect(
      periodoInvertido(
        reservasSearchSchema.parse({ vencimentoDe: '2026-11-10' }),
      ),
    ).toBe(false);
    expect(toListReservasQuery(reservasSearchSchema.parse({}), true)).toEqual({
      page: 1,
      pageSize: 20,
    });
  });
});
