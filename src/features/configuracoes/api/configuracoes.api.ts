import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';

export type Prazos = components['schemas']['PrazosDto'];
export type UpdatePrazos = components['schemas']['UpdateConfiguracoesDto'];

/** A API usa 7 dias quando a chave ainda não foi gravada: a tela mostra o mesmo. */
const PRAZO_PADRAO = 7;

/** A lista vem como chave e valor; a tela trabalha com os dois prazos pelo nome. */
export async function getPrazos(): Promise<Prazos> {
  const { data } = await unwrap(
    api.GET('/v1/configuracoes', {
      params: { query: { page: 1, pageSize: 100 } },
    }),
  );
  const valor = (chave: string) =>
    data.find((item) => item.chave === chave)?.valor ?? PRAZO_PADRAO;

  return {
    prazoReservaDias: valor('prazo_reserva_dias'),
    prazoAnaliseDiasUteis: valor('prazo_analise_dias_uteis'),
  };
}

export function updatePrazos(body: UpdatePrazos) {
  return unwrap(api.PATCH('/v1/configuracoes', { body }));
}
