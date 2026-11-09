import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';

export type Cliente = components['schemas']['ClienteDto'];
export type ClienteResumo = components['schemas']['ClienteResumoDto'];
export type CreateCliente = components['schemas']['CreateClienteDto'];
export type UpdateCliente = components['schemas']['UpdateClienteDto'];
export type ListClientesQuery = NonNullable<
  paths['/v1/clientes']['get']['parameters']['query']
>;
export type HistoricoClienteItem = components['schemas']['HistoricoClienteDto'];
export type ListHistoricoClienteQuery = NonNullable<
  paths['/v1/clientes/{id}/historico']['get']['parameters']['query']
>;

/** A lista traz só id e nome: documento e contatos ficam no detalhe (LGPD). */
export function listClientes(query: ListClientesQuery) {
  return unwrap(api.GET('/v1/clientes', { params: { query } }));
}

export function getCliente(id: string) {
  return unwrap(api.GET('/v1/clientes/{id}', { params: { path: { id } } }));
}

export function listHistoricoCliente(
  id: string,
  query: ListHistoricoClienteQuery,
  signal?: AbortSignal,
) {
  return unwrap(
    api.GET('/v1/clientes/{id}/historico', {
      params: { path: { id }, query },
      signal,
    }),
  );
}

export function createCliente(body: CreateCliente) {
  return unwrap(api.POST('/v1/clientes', { body }));
}

export function updateCliente(id: string, body: UpdateCliente) {
  return unwrap(
    api.PATCH('/v1/clientes/{id}', { params: { path: { id } }, body }),
  );
}

/**
 * O `409` do documento repetido não diz qual é o cliente. A busca por documento
 * completo o encontra, para a tela oferecer o link para o cadastro existente.
 */
export async function findClienteByDocumento(documento: string) {
  const { data } = await listClientes({ page: 1, pageSize: 1, q: documento });

  return data[0] ?? null;
}
