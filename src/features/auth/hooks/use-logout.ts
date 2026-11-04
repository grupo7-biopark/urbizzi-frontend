import { useMutation, useQueryClient } from '@tanstack/react-query';
import { navigateTo } from '@/shared/auth/navigation';
import { LOGIN_PATH } from '@/shared/auth/session-paths';
import { logout } from '../api/auth.api';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      navigateTo(LOGIN_PATH);
    },
  });
}
