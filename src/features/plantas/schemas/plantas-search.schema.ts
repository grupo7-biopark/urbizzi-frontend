import { z } from 'zod';

// `.catch()` evita que uma URL editada à mão derrube a tela.
export const plantasSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});

export type PlantasSearch = z.infer<typeof plantasSearchSchema>;
