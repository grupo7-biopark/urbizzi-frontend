import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import {
  getCliente,
  listClientes,
  type ListClientesQuery,
} from './clientes.api';

// A chave da lista leva o `q`, que pode ser um documento. Ela fica só na memória
// do TanStack Query: nunca vai para a URL, para o `localStorage` nem para log.
export const clientesKeys = {
  all: ['clientes'] as const,
  lists: () => [...clientesKeys.all, 'list'] as const,
  list: (query: ListClientesQuery) => [...clientesKeys.lists(), query] as const,
  details: () => [...clientesKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientesKeys.details(), id] as const,
};

export function clientesListOptions(query: ListClientesQuery) {
  return queryOptions({
    queryKey: clientesKeys.list(query),
    queryFn: () => listClientes(query),
    placeholderData: keepPreviousData,
  });
}

export function clienteDetailOptions(id: string) {
  return queryOptions({
    queryKey: clientesKeys.detail(id),
    queryFn: () => getCliente(id),
  });
}
