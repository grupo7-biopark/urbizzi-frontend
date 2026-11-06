import { z } from 'zod';

// As mesmas regras do backend, para a resposta ser imediata; quem decide é a API.
const SENHA_MINIMA = 8;
const SENHA_MAXIMA = 1024;

export const REGRAS_DA_SENHA = `Use de ${SENHA_MINIMA} a ${SENHA_MAXIMA} caracteres.`;

export const recuperarSenhaSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail')
    .max(254, 'Use até 254 caracteres')
    .pipe(z.email('Informe um e-mail válido')),
});

export type RecuperarSenhaValues = z.infer<typeof recuperarSenhaSchema>;

// Sem `trim`: espaços fazem parte da senha, como na API.
export const redefinirSenhaSchema = z
  .object({
    senha: z
      .string()
      .min(SENHA_MINIMA, `Use pelo menos ${SENHA_MINIMA} caracteres`)
      .max(SENHA_MAXIMA, `Use até ${SENHA_MAXIMA} caracteres`),
    confirmacao: z.string().min(1, 'Repita a nova senha'),
  })
  .refine(({ senha, confirmacao }) => senha === confirmacao, {
    message: 'As senhas não são iguais',
    path: ['confirmacao'],
  });

export type RedefinirSenhaValues = z.infer<typeof redefinirSenhaSchema>;

/** Fora do formato, o token nem vai à API: a tela já avisa que o link não vale. */
export const tokenRecuperacaoSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
