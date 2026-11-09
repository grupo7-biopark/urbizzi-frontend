import { z } from 'zod';
export const TIPOS_ENTIDADE = [
  'Loteamento',
  'Quadra',
  'Lote',
  'Cliente',
  'Reserva',
  'Proposta',
  'Usuario',
  'Configuracao',
  'LinkPublico',
  'Planta',
] as const;
const uuid = z.union([
  z.literal(''),
  z.uuid({ error: 'Informe um identificador válido.' }),
]);
const dia = z.union([
  z.literal(''),
  z.iso.date({ error: 'Informe uma data válida.' }),
]);
export const historicoFiltrosSchema = z
  .object({
    entidadeTipo: z.union([z.literal(''), z.enum(TIPOS_ENTIDADE)]),
    entidadeId: uuid,
    usuarioId: uuid,
    dataDe: dia,
    dataAte: dia,
  })
  .refine((v) => !v.dataDe || !v.dataAte || v.dataDe <= v.dataAte, {
    path: ['dataAte'],
    message: 'A data final deve ser igual ou posterior à inicial.',
  });
export const historicoSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  entidadeTipo: z.enum(TIPOS_ENTIDADE).optional().catch(undefined),
  entidadeId: z.uuid().optional().catch(undefined),
  usuarioId: z.uuid().optional().catch(undefined),
  dataDe: z.iso.date().optional().catch(undefined),
  dataAte: z.iso.date().optional().catch(undefined),
});
export type HistoricoSearch = z.infer<typeof historicoSearchSchema>;
