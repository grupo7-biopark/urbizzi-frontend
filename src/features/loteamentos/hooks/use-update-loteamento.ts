import { useApiMutation } from '@/shared/ui/use-api-mutation';
import {
  updateLoteamento,
  type UpdateLoteamento,
} from '../api/loteamentos.api';
import { loteamentosKeys } from '../api/loteamentos.queries';

export function useUpdateLoteamento(id: string) {
  return useApiMutation({
    mutationFn: (body: UpdateLoteamento) => updateLoteamento(id, body),
    invalidates: [loteamentosKeys.lists(), loteamentosKeys.detail(id)],
    successMessage: 'Loteamento atualizado',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
