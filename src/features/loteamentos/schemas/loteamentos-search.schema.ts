import { z } from 'zod';

// `.catch()` evita que uma URL editada à mão derrube a tela.
export const loteamentosSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  q: z.string().trim().min(1).optional().catch(undefined),
});

export type LoteamentosSearch = z.infer<typeof loteamentosSearchSchema>;

/** O id vai direto para a API: fora do formato, a rota não existe. */
export const loteamentoIdSchema = z.uuid();
