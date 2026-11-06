import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { createQuadra, type CreateQuadra } from '../api/loteamentos.api';
import { quadrasKeys } from '../api/loteamentos.queries';

export function useCreateQuadra(loteamentoId: string) {
  return useApiMutation({
    mutationFn: (body: CreateQuadra) => createQuadra(loteamentoId, body),
    invalidates: [quadrasKeys.lists(loteamentoId)],
    successMessage: 'Quadra cadastrada',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
