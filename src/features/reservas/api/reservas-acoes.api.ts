import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';

export type Reserva = components['schemas']['ReservaDto'];
export type CancelarReserva = components['schemas']['CancelarReservaDto'];
export type RenovacaoReserva = components['schemas']['RenovacaoDto'];

export function renovarReserva(id: string) {
  return unwrap(
    api.POST('/v1/reservas/{id}/renovar', { params: { path: { id } } }),
  );
}

export function cancelarReserva({
  id,
  body,
}: {
  id: string;
  body: CancelarReserva;
}) {
  return unwrap(
    api.POST('/v1/reservas/{id}/cancelar', { params: { path: { id } }, body }),
  );
}

export function listRenovacoesReserva(id: string, page: number) {
  return unwrap(
    api.GET('/v1/reservas/{id}/renovacoes', {
      params: { path: { id }, query: { page, pageSize: 20 } },
    }),
  );
}
