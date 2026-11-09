import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';

export function criarReserva(body: components['schemas']['CreateReservaDto']) {
  return unwrap(api.POST('/v1/reservas', { body }));
}

export function preverReserva(signal: AbortSignal) {
  return unwrap(api.GET('/v1/reservas/previsao', { signal }));
}
