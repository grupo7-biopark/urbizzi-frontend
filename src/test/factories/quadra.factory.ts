import type { Quadra } from '@/features/loteamentos/api/loteamentos.api';

export function makeQuadra(overrides: Partial<Quadra> = {}): Quadra {
  return {
    id: '1c1b8f8e-5a52-4a8e-9d3f-2c7f1e5a9b10',
    loteamentoId: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    numero: 'A',
    createdAt: '2026-10-28T12:00:00.000Z',
    updatedAt: '2026-10-28T12:00:00.000Z',
    ...overrides,
  };
}
