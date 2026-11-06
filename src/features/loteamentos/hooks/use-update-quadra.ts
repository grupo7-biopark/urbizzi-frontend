import { useApiMutation } from '@/shared/ui/use-api-mutation';
import {
  updateQuadra,
  type Quadra,
  type UpdateQuadra,
} from '../api/loteamentos.api';
import { quadrasKeys } from '../api/loteamentos.queries';

export function useUpdateQuadra({ id, loteamentoId }: Quadra) {
  return useApiMutation({
    mutationFn: (body: UpdateQuadra) => updateQuadra(id, body),
    invalidates: [quadrasKeys.lists(loteamentoId)],
    successMessage: 'Quadra atualizada',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
