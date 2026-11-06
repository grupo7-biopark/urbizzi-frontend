import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { deleteQuadra, type Quadra } from '../api/loteamentos.api';
import { quadrasKeys } from '../api/loteamentos.queries';

export function useDeleteQuadra({ id, loteamentoId }: Quadra) {
  return useApiMutation({
    mutationFn: () => deleteQuadra(id),
    invalidates: [quadrasKeys.lists(loteamentoId)],
    successMessage: 'Quadra removida',
    errorToast: false, // o `ConfirmDialog` mostra o erro nele mesmo
  });
}
