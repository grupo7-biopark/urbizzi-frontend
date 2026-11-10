import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { createQuadra } from '../api/loteamentos.api';
import { geografiaKeys } from '../api/geografia.queries';
import { quadrasKeys } from '../api/loteamentos.queries';

export function useCreateQuadra(loteamentoId: string) {
  return useApiMutation({
    mutationFn: (body: Parameters<typeof createQuadra>[1]) =>
      createQuadra(loteamentoId, body),
    invalidates: [geografiaKeys.all, quadrasKeys.lists(loteamentoId)],
    successMessage: 'Quadra cadastrada',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
