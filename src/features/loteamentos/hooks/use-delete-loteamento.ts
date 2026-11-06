import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { deleteLoteamento } from '../api/loteamentos.api';
import { loteamentosKeys } from '../api/loteamentos.queries';

export function useDeleteLoteamento() {
  return useApiMutation({
    mutationFn: deleteLoteamento,
    // Só as listas: invalidar o detalhe aberto o buscaria de novo e mostraria um 404.
    invalidates: [loteamentosKeys.lists()],
    successMessage: 'Loteamento removido',
    errorToast: false, // o `ConfirmDialog` mostra o erro nele mesmo
  });
}
