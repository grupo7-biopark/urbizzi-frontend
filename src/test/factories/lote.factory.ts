import type { Lote } from '@/features/lotes/api/lotes.api';

export function makeLote(overrides: Partial<Lote> = {}): Lote {
  return {
    id: '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    loteamentoId: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    quadraId: '1c1b8f8e-5a52-4a8e-9d3f-2c7f1e5a9b10',
    numero: '12',
    areaM2: '360.00',
    valor: '250000.00',
    exibirValorPublico: false,
    observacoes: null,
    status: 'DISPONIVEL',
    createdAt: '2026-10-28T12:00:00.000Z',
    updatedAt: '2026-10-28T12:00:00.000Z',
    ...overrides,
  };
}
