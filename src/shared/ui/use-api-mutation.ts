'use client';

import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { isSessionExpired } from '@/shared/auth/session-expired';
import { useToast } from './toast';

type ApiMutationOptions<Data, Variables> = {
  mutationFn: (variables: Variables) => Promise<Data>;
  /** O que a mutação pode ter alterado. A comparação é por prefixo. */
  invalidates: QueryKey[] | ((data: Data) => QueryKey[]);
  successMessage: string;
  /** Desligue dentro de um `Form`, que já mostra o erro nele mesmo. */
  errorToast?: boolean;
};

/** Mutação padrão: invalida as queries afetadas e avisa o resultado com um Toast. */
export function useApiMutation<Data, Variables = void>({
  mutationFn,
  invalidates,
  successMessage,
  errorToast = true,
}: ApiMutationOptions<Data, Variables>) {
  const queryClient = useQueryClient();
  const toast = useToast();

  function invalidate(keys: QueryKey[]) {
    return Promise.all(
      keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  }

  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      await invalidate(
        typeof invalidates === 'function' ? invalidates(data) : invalidates,
      );
      toast({ title: successMessage, variant: 'sucesso' });
    },
    onError: async (error) => {
      // Conflito significa que a tela mostra um estado que já mudou.
      if (
        error instanceof ApiError &&
        error.statusCode === 409 &&
        Array.isArray(invalidates)
      ) {
        await invalidate(invalidates);
      }

      // Sessão perdida já leva ao login: o aviso sumiria na navegação.
      if (errorToast && !isSessionExpired(error)) {
        toast({ title: getErrorMessage(error), variant: 'erro' });
      }
    },
  });
}
