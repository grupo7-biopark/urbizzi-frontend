import { z } from 'zod';
import type { ListUsuariosQuery } from '../api/usuarios.api';

export const PERFIS = [
  'ADMINISTRADOR',
  'GESTOR',
  'COMERCIAL',
  'CONSULTA',
] as const;

// `.catch()` evita que uma URL editada à mão derrube a tela.
export const usuariosSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  perfil: z.enum(PERFIS).optional().catch(undefined),
  situacao: z.enum(['ativos', 'inativos']).optional().catch(undefined),
});

export type UsuariosSearch = z.infer<typeof usuariosSearchSchema>;

/** Na URL, "ativos" e "inativos"; na API, o booleano `ativo`. */
export function toListUsuariosQuery({
  situacao,
  ...search
}: UsuariosSearch): ListUsuariosQuery {
  return {
    ...search,
    ...(situacao ? { ativo: situacao === 'ativos' } : {}),
  };
}

/** O id vai direto para a API: fora do formato, a rota não existe. */
export const usuarioIdSchema = z.uuid();
