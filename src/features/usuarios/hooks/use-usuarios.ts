import { useApiMutation } from '@/shared/ui/use-api-mutation';
import {
  ativarUsuario,
  createUsuario,
  desativarUsuario,
  updateUsuario,
  type UpdateUsuario,
} from '../api/usuarios.api';
import { usuariosKeys } from '../api/usuarios.queries';

export function useCreateUsuario() {
  return useApiMutation({
    mutationFn: createUsuario,
    invalidates: [usuariosKeys.lists()],
    successMessage: 'Usuário cadastrado',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}

export function useUpdateUsuario(id: string) {
  return useApiMutation({
    mutationFn: (body: UpdateUsuario) => updateUsuario(id, body),
    invalidates: [usuariosKeys.lists(), usuariosKeys.detail(id)],
    successMessage: 'Usuário atualizado',
    errorToast: false, // o `Form` mostra o erro nele mesmo
  });
}

export function useDesativarUsuario() {
  return useApiMutation({
    mutationFn: desativarUsuario,
    invalidates: [usuariosKeys.all],
    successMessage: 'Usuário desativado',
    errorToast: false, // o `ConfirmDialog` mostra o erro nele mesmo
  });
}

export function useAtivarUsuario() {
  return useApiMutation({
    mutationFn: ativarUsuario,
    invalidates: [usuariosKeys.all],
    successMessage: 'Usuário ativado',
  });
}
