import 'server-only';
import { createHash } from 'node:crypto';
import { getServerApi } from '@/shared/api/client.server';
import type { SessionTokens } from './session.server';

export type RefreshResult =
  | { outcome: 'renewed'; tokens: SessionTokens }
  /** A API recusou o token: a sessão acabou. */
  | { outcome: 'rejected'; status: number; body: unknown }
  /** Falha temporária (429, 5xx, rede): a sessão continua valendo. */
  | { outcome: 'unavailable'; status: number; body: unknown };

/**
 * Por quanto tempo o resultado de uma renovação continua disponível. Uma
 * requisição enviada com o cookie antigo pode receber `401` depois que a
 * renovação terminou. Como o refresh token é de uso único, tentar de novo com
 * ele derrubaria a sessão.
 */
const RESULT_GRACE_MS = 10_000;

type RefreshStore = Map<string, Promise<RefreshResult>>;

// Em `globalThis` porque cada Route Handler pode ser empacotado com sua própria
// cópia deste módulo, e a renovação precisa ser única entre todos eles.
const globalStore = globalThis as typeof globalThis & {
  urbizziRefreshes?: RefreshStore;
};
const refreshes: RefreshStore = (globalStore.urbizziRefreshes ??= new Map());

async function requestRefresh(refreshToken: string): Promise<RefreshResult> {
  try {
    const { data, error, response } = await getServerApi().POST(
      '/v1/auth/refresh',
      { body: { refreshToken } },
    );

    if (data) {
      return { outcome: 'renewed', tokens: data };
    }

    const outcome =
      response.status === 400 || response.status === 401
        ? 'rejected'
        : 'unavailable';

    return { outcome, status: response.status, body: error };
  } catch {
    return { outcome: 'unavailable', status: 502, body: undefined };
  }
}

/**
 * Renova a sessão uma vez por refresh token, mesmo com requisições simultâneas.
 * Vale por processo: com mais de uma réplica, seria preciso um armazenamento
 * compartilhado.
 */
export function refreshSession(refreshToken: string) {
  const key = createHash('sha256').update(refreshToken).digest('base64url');
  const current = refreshes.get(key);

  if (current) {
    return current;
  }

  const pending = requestRefresh(refreshToken).then((result) => {
    if (result.outcome === 'renewed') {
      setTimeout(() => refreshes.delete(key), RESULT_GRACE_MS).unref();
    } else {
      refreshes.delete(key);
    }

    return result;
  });

  refreshes.set(key, pending);
  return pending;
}
