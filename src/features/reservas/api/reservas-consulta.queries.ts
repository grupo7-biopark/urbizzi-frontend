import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import {
  listLoteamentosReservas,
  listReservas,
  listVendedoresReservas,
  type ListReservasQuery,
} from './reservas-consulta.api';

export function vendedoresReservasOptions(enabled: boolean) {
  return queryOptions({
    queryKey: ['reservas', 'opcoes-vendedores'],
    queryFn: listVendedoresReservas,
    enabled,
  });
}

export function reservasListOptions(query: ListReservasQuery, minhas: boolean) {
  return queryOptions({
    queryKey: ['reservas', 'list', { minhas, ...query }],
    queryFn: () => listReservas(query, minhas),
    placeholderData: keepPreviousData,
  });
}

export function loteamentosReservasOptions() {
  return queryOptions({
    queryKey: ['reservas', 'opcoes-loteamentos'],
    queryFn: listLoteamentosReservas,
  });
}
