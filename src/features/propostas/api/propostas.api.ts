import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';
import { ApiError } from '@/shared/api/errors';

export type CreateProposta = components['schemas']['CreatePropostaDto'];
export type Proposta = components['schemas']['PropostaDto'];
export type MinhasPropostasQuery = NonNullable<
  paths['/v1/propostas/minhas']['get']['parameters']['query']
>;
export type PendentesQuery = NonNullable<
  paths['/v1/propostas/pendentes']['get']['parameters']['query']
>;
export type DecisaoProposta = 'aprovar' | 'rejeitar';

export function listPendentes(query: PendentesQuery) {
  return unwrap(api.GET('/v1/propostas/pendentes', { params: { query } }));
}

export function decidirProposta({
  id,
  decisao,
  motivo,
}: {
  id: string;
  decisao: DecisaoProposta;
  motivo: components['schemas']['DecidirPropostaDto']['motivo'];
}) {
  return decisao === 'aprovar'
    ? unwrap(
        api.POST('/v1/propostas/{id}/aprovar', {
          params: { path: { id } },
          body: { motivo },
        }),
      )
    : unwrap(
        api.POST('/v1/propostas/{id}/rejeitar', {
          params: { path: { id } },
          body: { motivo },
        }),
      );
}

async function permitirRemovido<T>(pedido: Promise<T>): Promise<T | null> {
  try {
    return await pedido;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export async function getPendencia(id: string) {
  const proposta = await unwrap(
    api.GET('/v1/propostas/{id}', { params: { path: { id } } }),
  );
  const reserva = await unwrap(
    api.GET('/v1/reservas/{id}', {
      params: { path: { id: proposta.reservaId } },
    }),
  );
  const [lote, cliente] = await Promise.all([
    permitirRemovido(
      unwrap(
        api.GET('/v1/lotes/{id}', { params: { path: { id: reserva.loteId } } }),
      ),
    ),
    permitirRemovido(
      unwrap(
        api.GET('/v1/clientes/{id}', {
          params: { path: { id: reserva.clienteId } },
        }),
      ),
    ),
  ]);
  return { proposta, reserva, lote, cliente };
}

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
