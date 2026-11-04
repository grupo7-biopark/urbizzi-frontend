import { z } from 'zod';

// Só evita uma chamada inútil: as regras de senha valem na criação, não aqui.
export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail')
    .pipe(z.email('Informe um e-mail válido')),
  senha: z.string().min(1, 'Informe a senha'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
