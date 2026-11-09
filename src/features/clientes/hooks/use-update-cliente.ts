import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { updateCliente, type UpdateCliente } from '../api/clientes.api';
import { clientesKeys } from '../api/clientes.queries';

export function useUpdateCliente(id: string) {
  return useApiMutation({
    mutationFn: (body: UpdateCliente) => updateCliente(id, body),
    invalidates: [clientesKeys.lists(), clientesKeys.detail(id)],
    successMessage: 'Cliente atualizado',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}
