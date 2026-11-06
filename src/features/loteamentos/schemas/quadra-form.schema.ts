import { z } from 'zod';

// O limite repete o do backend para dar resposta imediata; quem decide é a API.
export const quadraFormSchema = z.object({
  numero: z
    .string()
    .trim()
    .min(1, 'Informe o número')
    .max(20, 'Use até 20 caracteres'),
});

export type QuadraFormValues = z.infer<typeof quadraFormSchema>;
