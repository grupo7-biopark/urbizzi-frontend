import type { QueryKey } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { cancelarReserva, renovarReserva } from '../api/reservas-acoes.api';

export function useRenovarReserva(invalidates: QueryKey[]) {
  return useApiMutation({
    mutationFn: renovarReserva,
    invalidates: [['reservas'], ...invalidates],
    successMessage: 'Reserva renovada',
    errorToast: false,
  });
}

export function useCancelarReserva(invalidates: QueryKey[]) {
  return useApiMutation({
    mutationFn: cancelarReserva,
    invalidates: [['reservas'], ...invalidates],
    successMessage: 'Reserva cancelada',
    errorToast: false,
  });
}
