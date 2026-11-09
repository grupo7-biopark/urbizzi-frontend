import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import {
  getUsuario,
  listUsuarios,
  type ListUsuariosQuery,
} from './usuarios.api';

export const usuariosKeys = {
  all: ['usuarios'] as const,
  lists: () => [...usuariosKeys.all, 'list'] as const,
  list: (query: ListUsuariosQuery) => [...usuariosKeys.lists(), query] as const,
  details: () => [...usuariosKeys.all, 'detail'] as const,
  detail: (id: string) => [...usuariosKeys.details(), id] as const,
};

export function usuariosListOptions(query: ListUsuariosQuery) {
  return queryOptions({
    queryKey: usuariosKeys.list(query),
    queryFn: () => listUsuarios(query),
    placeholderData: keepPreviousData,
  });
}

export function usuarioDetailOptions(id: string) {
  return queryOptions({
    queryKey: usuariosKeys.detail(id),
    queryFn: () => getUsuario(id),
  });
}
