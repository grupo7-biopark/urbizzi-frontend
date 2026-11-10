import { geografiaKeys } from '../api/geografia.queries';
import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { createLoteamento } from '../api/loteamentos.api';
import { loteamentosKeys } from '../api/loteamentos.queries';

export function useCreateLoteamento() {
  return useApiMutation({
    mutationFn: createLoteamento,
    invalidates: [geografiaKeys.all, loteamentosKeys.lists()],
    successMessage: 'Loteamento cadastrado',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
