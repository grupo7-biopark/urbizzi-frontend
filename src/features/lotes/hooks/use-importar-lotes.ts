import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importarLotes, type EnvioImportacao } from '../api/lotes.api';
import { lotesKeys } from '../api/lotes.queries';

export function usePreviaImportacao() {
  return useMutation({
    mutationFn: (envio: EnvioImportacao) => importarLotes(envio, false),
  });
}

/** Sem Toast: o resultado aparece na própria tela, com a quantidade importada. */
export function useConfirmarImportacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (envio: EnvioImportacao) => importarLotes(envio, true),
    onSuccess: async ({ importado }) => {
      // Também cria loteamentos e quadras: as opções dos filtros mudam junto com a lista.
      if (importado) {
        await queryClient.invalidateQueries({ queryKey: lotesKeys.all });
      }
    },
  });
}
