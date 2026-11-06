import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';

export type Loteamento = components['schemas']['LoteamentoDto'];
export type CreateLoteamento = components['schemas']['CreateLoteamentoDto'];
export type UpdateLoteamento = components['schemas']['UpdateLoteamentoDto'];
export type ListLoteamentosQuery = NonNullable<
  paths['/v1/loteamentos']['get']['parameters']['query']
>;

export function listLoteamentos(query: ListLoteamentosQuery) {
  return unwrap(api.GET('/v1/loteamentos', { params: { query } }));
}

export function getLoteamento(id: string) {
  return unwrap(api.GET('/v1/loteamentos/{id}', { params: { path: { id } } }));
}

export function createLoteamento(body: CreateLoteamento) {
  return unwrap(api.POST('/v1/loteamentos', { body }));
}

export function updateLoteamento(id: string, body: UpdateLoteamento) {
  return unwrap(
    api.PATCH('/v1/loteamentos/{id}', { params: { path: { id } }, body }),
  );
}

export function deleteLoteamento(id: string) {
  return unwrap(
    api.DELETE('/v1/loteamentos/{id}', { params: { path: { id } } }),
  );
}
