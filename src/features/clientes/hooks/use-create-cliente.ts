import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { createCliente } from '../api/clientes.api';
import { clientesKeys } from '../api/clientes.queries';

export function useCreateCliente() {
  return useApiMutation({
    mutationFn: createCliente,
    invalidates: [clientesKeys.lists()],
    successMessage: 'Cliente cadastrado',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
