import { z } from 'zod';
export const linksSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});
export const linkFormSchema = z.object({
  loteamentoId: z
    .union([z.literal(''), z.uuid({ error: 'Escolha um loteamento válido.' })])
    .transform((v) => v || null),
});
