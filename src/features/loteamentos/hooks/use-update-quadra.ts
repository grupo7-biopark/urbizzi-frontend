import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { updateQuadra, type Quadra } from '../api/loteamentos.api';
import { quadrasKeys } from '../api/loteamentos.queries';
import { geografiaKeys } from '../api/geografia.queries';

export function useUpdateQuadra({ id, loteamentoId }: Quadra) {
  return useApiMutation({
    mutationFn: (body: Parameters<typeof updateQuadra>[1]) =>
      updateQuadra(id, body),
    invalidates: [geografiaKeys.all, quadrasKeys.lists(loteamentoId)],
    successMessage: 'Quadra atualizada',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
