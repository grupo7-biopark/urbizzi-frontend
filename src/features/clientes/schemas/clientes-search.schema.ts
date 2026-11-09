import { z } from 'zod';

// Só a página vai para a URL. A busca aceita nome e documento, que são dados
// pessoais, então fica no estado do componente (docs/security.md, LGPD).
// `.catch()` evita que uma URL editada à mão derrube a tela.
export const clientesSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});

export type ClientesSearch = z.infer<typeof clientesSearchSchema>;

/** O id vai direto para a API: fora do formato, a rota não existe. */
export const clienteIdSchema = z.uuid();
