import { z } from 'zod';
import type { ConsultaMapa } from '../api/mapa.api';

// `.catch()` evita que uma URL editada à mão derrube a tela.
export const mapaSearchSchema = z.object({
  loteamentoId: z.uuid().optional().catch(undefined),
  status: z
    .enum(['DISPONIVEL', 'RESERVADO', 'VENDIDO', 'BLOQUEADO'])
    .optional()
    .catch(undefined),
});

export type MapaSearch = z.infer<typeof mapaSearchSchema>;

/** A API aceita vários status; a tela filtra por um. */
export function toConsultaMapa({
  status,
  loteamentoId,
}: MapaSearch): ConsultaMapa {
  return {
    ...(loteamentoId ? { loteamentoId } : {}),
    ...(status ? { status: [status] } : {}),
  };
}
