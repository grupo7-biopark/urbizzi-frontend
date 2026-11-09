import { z } from 'zod';

export const propostasSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});

export type PropostasSearch = z.infer<typeof propostasSearchSchema>;
