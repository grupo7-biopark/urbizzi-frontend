import { z } from 'zod';
import type { Perfil } from '../api/usuarios.api';
import { PERFIS } from './usuarios-search.schema';

// Os limites repetem os do backend para dar resposta imediata; quem decide é a API.
const camposDoUsuario = {
  nome: z
    .string()
    .trim()
    .min(1, 'Informe o nome')
    .max(150, 'Use até 150 caracteres'),
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail')
    .max(254, 'Use até 254 caracteres')
    .pipe(z.email('Informe um e-mail válido')),
  perfil: z.enum(PERFIS, 'Selecione o perfil'),
};

export const usuarioEdicaoFormSchema = z.object(camposDoUsuario);

// Sem `trim`: espaços fazem parte da senha, como na API.
export const usuarioFormSchema = z.object({
  ...camposDoUsuario,
  senha: z
    .string()
    .min(8, 'Use pelo menos 8 caracteres')
    .max(1024, 'Use até 1024 caracteres'),
});

export type UsuarioEdicaoFormValues = z.infer<typeof usuarioEdicaoFormSchema>;
export type UsuarioFormValues = z.infer<typeof usuarioFormSchema>;

export const ROTULOS_DOS_PERFIS: Record<Perfil, string> = {
  ADMINISTRADOR: 'Administrador',
  GESTOR: 'Gestor',
  COMERCIAL: 'Comercial',
  CONSULTA: 'Consulta',
};
