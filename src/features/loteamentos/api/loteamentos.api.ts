import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';

export type Loteamento = components['schemas']['LoteamentoDto'];
export type CreateLoteamento = components['schemas']['CreateLoteamentoDto'];
export type UpdateLoteamento = components['schemas']['UpdateLoteamentoDto'];
export type ListLoteamentosQuery = NonNullable<
  paths['/v1/loteamentos']['get']['parameters']['query']
>;

export type Quadra = components['schemas']['QuadraDto'];
export type CreateQuadra = components['schemas']['CreateQuadraDto'];
export type UpdateQuadra = components['schemas']['UpdateQuadraDto'];
export type ListQuadrasQuery = NonNullable<
  paths['/v1/loteamentos/{loteamentoId}/quadras']['get']['parameters']['query']
>;

export function listLoteamentos(query: ListLoteamentosQuery) {
  return unwrap(api.GET('/v1/loteamentos', { params: { query } }));
}

export function getLoteamento(id: string) {
  return unwrap(api.GET('/v1/loteamentos/{id}', { params: { path: { id } } }));
}

type Demarcacao = Partial<components['schemas']['SaveAreaGeograficaDto']>;
export function createLoteamento(body: CreateLoteamento & Demarcacao) {
  const { vertices, ...cadastro } = body;
  if (vertices !== undefined)
    return unwrap(
      api.POST('/v1/geografia/loteamentos', { body: { cadastro, vertices } }),
    );
  return unwrap(api.POST('/v1/loteamentos', { body: cadastro }));
}

export function updateLoteamento(
  id: string,
  body: UpdateLoteamento & Demarcacao,
) {
  const { vertices, ...cadastro } = body;
  if (vertices !== undefined)
    return unwrap(
      api.PATCH('/v1/geografia/loteamentos/{id}', {
        params: { path: { id } },
        body: { cadastro, vertices },
      }),
    );
  return unwrap(
    api.PATCH('/v1/loteamentos/{id}', {
      params: { path: { id } },
      body: cadastro,
    }),
  );
}

export function deleteLoteamento(id: string) {
  return unwrap(
    api.DELETE('/v1/loteamentos/{id}', { params: { path: { id } } }),
  );
}

export function listQuadras(loteamentoId: string, query: ListQuadrasQuery) {
  return unwrap(
    api.GET('/v1/loteamentos/{loteamentoId}/quadras', {
      params: { path: { loteamentoId }, query },
    }),
  );
}

export function createQuadra(
  loteamentoId: string,
  body: CreateQuadra & Demarcacao,
) {
  const { vertices, ...cadastro } = body;
  if (vertices !== undefined)
    return unwrap(
      api.POST('/v1/geografia/loteamentos/{loteamentoId}/quadras', {
        params: { path: { loteamentoId } },
        body: { cadastro, vertices },
      }),
    );
  return unwrap(
    api.POST('/v1/loteamentos/{loteamentoId}/quadras', {
      params: { path: { loteamentoId } },
      body: cadastro,
    }),
  );
}

export function updateQuadra(id: string, body: UpdateQuadra & Demarcacao) {
  const { vertices, ...cadastro } = body;
  if (vertices !== undefined)
    return unwrap(
      api.PATCH('/v1/geografia/quadras/{id}', {
        params: { path: { id } },
        body: { cadastro, vertices },
      }),
    );
  return unwrap(
    api.PATCH('/v1/quadras/{id}', { params: { path: { id } }, body: cadastro }),
  );
}

export function deleteQuadra(id: string) {
  return unwrap(api.DELETE('/v1/quadras/{id}', { params: { path: { id } } }));
}
