import { postBff } from '@/shared/api/bff-client';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';

export type Credenciais = components['schemas']['LoginDto'];

export function login(credenciais: Credenciais) {
  return postBff('/api/auth/login', credenciais);
}

export function logout() {
  return postBff('/api/auth/logout');
}

export function solicitarRecuperacao(
  body: components['schemas']['ForgotPasswordDto'],
) {
  return unwrap(api.POST('/v1/auth/forgot-password', { body }));
}

export function redefinirSenha(
  body: components['schemas']['ResetPasswordDto'],
) {
  return unwrap(api.POST('/v1/auth/reset-password', { body }));
}
