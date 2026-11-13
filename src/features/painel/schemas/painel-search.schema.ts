import { z } from 'zod';

const data = z.iso.date().optional().catch(undefined);

export const painelSearchSchema = z.object({
  loteamentoId: z.uuid().optional().catch(undefined),
  dataDe: data,
  dataAte: data,
  agrupamento: z.enum(['dia', 'semana', 'mes']).catch('mes'),
});

export type PainelSearch = z.infer<typeof painelSearchSchema>;

export function periodoInvalido({ dataDe, dataAte }: PainelSearch) {
  return Boolean(dataDe && dataAte && dataDe > dataAte);
}
