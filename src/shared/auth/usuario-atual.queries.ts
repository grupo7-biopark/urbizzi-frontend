import { queryOptions } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';

export const USUARIO_ATUAL_KEY = ['auth', 'me'] as const;

export function usuarioAtualOptions() {
  return queryOptions({
    queryKey: USUARIO_ATUAL_KEY,
    queryFn: () => unwrap(api.GET('/v1/auth/me')),
  });
}
