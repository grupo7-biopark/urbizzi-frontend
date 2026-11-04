import { postBff } from '@/shared/api/bff-client';
import type { components } from '@/shared/api/schema';

export type Credenciais = components['schemas']['LoginDto'];

export function login(credenciais: Credenciais) {
  return postBff('/api/auth/login', credenciais);
}

export function logout() {
  return postBff('/api/auth/logout');
}
