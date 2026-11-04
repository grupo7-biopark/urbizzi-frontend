import {
  environmentManager,
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';
import { handleSessionExpired } from '@/shared/auth/session-expired';
import { ApiError, NETWORK_ERROR_STATUS } from './errors';

const MAX_RETRIES = 3;
const STALE_TIME_MS = 60 * 1000;

function isTransient(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.statusCode === NETWORK_ERROR_STATUS || error.statusCode >= 500)
  );
}

export function shouldRetryQuery(failureCount: number, error: unknown) {
  return failureCount < MAX_RETRIES && isTransient(error);
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleSessionExpired }),
    mutationCache: new MutationCache({ onError: handleSessionExpired }),
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        // Acima de zero para não buscar de novo logo após hidratar.
        staleTime: STALE_TIME_MS,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * No servidor, um cliente por requisição, para não vazar dados entre usuários.
 * No navegador, um só, para o React não perder o cache se suspender na
 * renderização inicial (por isso não usa `useState`).
 */
export function getQueryClient() {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
