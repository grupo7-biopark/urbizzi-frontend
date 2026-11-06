import { z } from 'zod';
import type { ListLotesQuery } from '../api/lotes.api';

// `.catch()` evita que uma URL editada à mão derrube a tela.
export const lotesSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  q: z.string().trim().min(1).optional().catch(undefined),
  status: z
    .enum(['DISPONIVEL', 'RESERVADO', 'VENDIDO', 'BLOQUEADO'])
    .optional()
    .catch(undefined),
  loteamentoId: z.uuid().optional().catch(undefined),
  quadraId: z.uuid().optional().catch(undefined),
});

export type LotesSearch = z.infer<typeof lotesSearchSchema>;

/** A API aceita vários status; a tela filtra por um. */
export function toListLotesQuery({
  status,
  ...search
}: LotesSearch): ListLotesQuery {
  return { ...search, ...(status ? { status: [status] } : {}) };
}

/** O id vai direto para a API: fora do formato, a rota não existe. */
export const loteIdSchema = z.uuid();
