import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';

export type CreateProposta = components['schemas']['CreatePropostaDto'];
export type Proposta = components['schemas']['PropostaDto'];
export type MinhasPropostasQuery = NonNullable<
  paths['/v1/propostas/minhas']['get']['parameters']['query']
>;

export function listMinhasPropostas(query: MinhasPropostasQuery) {
  return unwrap(api.GET('/v1/propostas/minhas', { params: { query } }));
}

export function createProposta({
  reservaId,
  body,
}: {
  reservaId: string;
  body: CreateProposta;
}) {
  return unwrap(
    api.POST('/v1/reservas/{reservaId}/propostas', {
      params: { path: { reservaId } },
      body,
    }),
  );
}
