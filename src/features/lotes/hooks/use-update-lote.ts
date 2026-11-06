import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { updateLote, type UpdateLote } from '../api/lotes.api';
import { lotesKeys } from '../api/lotes.queries';

export function useUpdateLote(id: string) {
  return useApiMutation({
    mutationFn: (body: UpdateLote) => updateLote(id, body),
    invalidates: [lotesKeys.lists(), lotesKeys.detail(id)],
    successMessage: 'Lote atualizado',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
