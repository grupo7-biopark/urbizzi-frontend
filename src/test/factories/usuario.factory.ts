import type { Usuario } from '@/features/usuarios/api/usuarios.api';

export function makeUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: '6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    nome: 'Maria Silva',
    email: 'maria@exemplo.com',
    perfil: 'COMERCIAL',
    ativo: true,
    ...overrides,
  };
}
