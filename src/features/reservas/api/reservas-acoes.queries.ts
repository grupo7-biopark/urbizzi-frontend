import { queryOptions } from '@tanstack/react-query';
import { listRenovacoesReserva } from './reservas-acoes.api';

export function renovacoesReservaOptions(id: string, page: number) {
  return queryOptions({
    queryKey: ['reservas', id, 'renovacoes', page],
    queryFn: () => listRenovacoesReserva(id, page),
  });
}
