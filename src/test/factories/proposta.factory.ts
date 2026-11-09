import type { Proposta } from '@/features/propostas/api/propostas.api';

export function makeProposta(overrides: Partial<Proposta> = {}): Proposta {
  return {
    id: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    reservaId: '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    vendedorId: '6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    valor: '200000.00',
    condicoes: 'Pagamento à vista',
    observacoes: null,
    status: 'EM_ANALISE',
    dataEnvio: '2026-11-09T12:00:00Z',
    prazoLimite: '2099-11-18T12:00:00Z',
    decididoPorId: null,
    dataDecisao: null,
    motivoDecisao: null,
    atrasada: false,
    ...overrides,
  };
}
