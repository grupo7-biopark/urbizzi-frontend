import type { Loteamento } from '@/features/loteamentos/api/loteamentos.api';

export function makeLoteamento(
  overrides: Partial<Loteamento> = {},
): Loteamento {
  return {
    id: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    nome: 'Residencial Teste',
    descricao: null,
    localizacao: null,
    createdAt: '2026-10-28T12:00:00.000Z',
    updatedAt: '2026-10-28T12:00:00.000Z',
    ...overrides,
  };
}
