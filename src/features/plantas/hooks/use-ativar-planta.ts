import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { ativarPlanta } from '../api/plantas.api';
import { plantasKeys } from '../api/plantas.queries';

export function useAtivarPlanta() {
  return useApiMutation({
    mutationFn: ativarPlanta,
    // Ativar uma planta também desativa a anterior, em outra linha da lista.
    invalidates: [plantasKeys.lists()],
    successMessage: 'Planta ativada',
    errorToast: false, // o diálogo de confirmação mostra o erro nele mesmo
  });
}
