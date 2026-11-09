import type { Cliente } from '@/features/clientes/api/clientes.api';

/** Dados fictícios: o CPF é válido pela conta, mas não é de ninguém de verdade. */
export function makeCliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
    id: '2872822b-14be-41ea-881f-a8c0c11c1ffd',
    nome: 'Cliente Teste',
    documento: '52998224725',
    telefone: null,
    email: null,
    observacoes: null,
    createdAt: '2026-11-03T12:00:00.000Z',
    updatedAt: '2026-11-03T12:00:00.000Z',
    ...overrides,
  };
}
