import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { createLote } from '../api/lotes.api';
import { lotesKeys } from '../api/lotes.queries';

export function useCreateLote() {
  return useApiMutation({
    mutationFn: createLote,
    invalidates: [lotesKeys.lists()],
    successMessage: 'Lote cadastrado',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
