import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { deleteLote } from '../api/lotes.api';
import { lotesKeys } from '../api/lotes.queries';

export function useDeleteLote() {
  return useApiMutation({
    mutationFn: deleteLote,
    invalidates: [lotesKeys.lists()],
    successMessage: 'Lote removido',
    errorToast: false, // o `ConfirmDialog` mostra o erro nele mesmo
  });
}
