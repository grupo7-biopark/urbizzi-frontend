import { z } from 'zod';
import type { ListReservasQuery } from '../api/reservas-consulta.api';

const dataFiltro = z.iso.date().optional().catch(undefined);

export const reservasSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  minhas: z.enum(['true', 'false']).catch('false'),
  status: z
    .enum(['ATIVA', 'CANCELADA', 'EXPIRADA', 'CONVERTIDA'])
    .optional()
    .catch(undefined),
  vendedorId: z.uuid().optional().catch(undefined),
  loteamentoId: z.uuid().optional().catch(undefined),
  vencimentoDe: dataFiltro,
  vencimentoAte: dataFiltro,
});

export type ReservasSearch = z.infer<typeof reservasSearchSchema>;

export function periodoInvertido(search: ReservasSearch) {
  return Boolean(
    search.vencimentoDe &&
    search.vencimentoAte &&
    search.vencimentoDe > search.vencimentoAte,
  );
}

// Dias locais: fim inclusivo até 23:59:59.999, respeitando o fuso do navegador.
export function toListReservasQuery(
  search: ReservasSearch,
  minhas: boolean,
): ListReservasQuery {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.status ? { status: [search.status] } : {}),
    ...(!minhas && search.vendedorId ? { vendedorId: search.vendedorId } : {}),
    ...(search.loteamentoId ? { loteamentoId: search.loteamentoId } : {}),
    ...(search.vencimentoDe
      ? {
          vencimentoDe: new Date(
            `${search.vencimentoDe}T00:00:00`,
          ).toISOString(),
        }
      : {}),
    ...(search.vencimentoAte
      ? {
          vencimentoAte: new Date(
            `${search.vencimentoAte}T23:59:59.999`,
          ).toISOString(),
        }
      : {}),
  };
}
