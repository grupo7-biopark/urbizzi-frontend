import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { updatePrazos } from '../api/configuracoes.api';
import { configuracoesKeys } from '../api/configuracoes.queries';

export function useUpdatePrazos() {
  return useApiMutation({
    mutationFn: updatePrazos,
    invalidates: [configuracoesKeys.all],
    successMessage: 'Configurações salvas',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
