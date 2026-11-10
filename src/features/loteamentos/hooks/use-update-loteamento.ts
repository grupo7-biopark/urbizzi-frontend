import { geografiaKeys } from '../api/geografia.queries';
import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { updateLoteamento } from '../api/loteamentos.api';
import { loteamentosKeys } from '../api/loteamentos.queries';

export function useUpdateLoteamento(id: string) {
  return useApiMutation({
    mutationFn: (body: Parameters<typeof updateLoteamento>[1]) =>
      updateLoteamento(id, body),
    invalidates: [
      geografiaKeys.all,
      loteamentosKeys.lists(),
      loteamentosKeys.detail(id),
    ],
    successMessage: 'Loteamento atualizado',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
