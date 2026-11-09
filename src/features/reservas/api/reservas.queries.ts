import { queryOptions } from '@tanstack/react-query';
import { preverReserva } from './reservas.api';

export const reservasKeys = {
  all: ['reservas'] as const,
  previsao: () => [...reservasKeys.all, 'previsao'] as const,
};

export function previsaoReservaOptions() {
  return queryOptions({
    queryKey: reservasKeys.previsao(),
    queryFn: ({ signal }) => preverReserva(signal),
    refetchOnMount: 'always',
  });
}
