import { geografiaKeys } from '../api/geografia.queries';
import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { updateLote } from '../api/lotes.api';
import { lotesKeys } from '../api/lotes.queries';

export function useUpdateLote(id: string) {
  return useApiMutation({
    mutationFn: (body: Parameters<typeof updateLote>[1]) =>
      updateLote(id, body),
    invalidates: [geografiaKeys.all, lotesKeys.lists(), lotesKeys.detail(id)],
    successMessage: 'Lote atualizado',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
