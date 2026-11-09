import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';

export type Usuario = components['schemas']['UsuarioDto'];
export type Perfil = components['schemas']['PerfilCodigo'];
export type CreateUsuario = components['schemas']['CreateUsuarioDto'];
export type UpdateUsuario = components['schemas']['UpdateUsuarioDto'];
export type ListUsuariosQuery = NonNullable<
  paths['/v1/usuarios']['get']['parameters']['query']
>;

export function listUsuarios(query: ListUsuariosQuery) {
  return unwrap(api.GET('/v1/usuarios', { params: { query } }));
}

export function getUsuario(id: string) {
  return unwrap(api.GET('/v1/usuarios/{id}', { params: { path: { id } } }));
}

export function createUsuario(body: CreateUsuario) {
  return unwrap(api.POST('/v1/usuarios', { body }));
}

export function updateUsuario(id: string, body: UpdateUsuario) {
  return unwrap(
    api.PATCH('/v1/usuarios/{id}', { params: { path: { id } }, body }),
  );
}

export function ativarUsuario(id: string) {
  return unwrap(
    api.POST('/v1/usuarios/{id}/ativar', { params: { path: { id } } }),
  );
}

export function desativarUsuario(id: string) {
  return unwrap(
    api.POST('/v1/usuarios/{id}/desativar', { params: { path: { id } } }),
  );
}
