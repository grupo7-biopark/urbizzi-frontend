import { z } from 'zod';

export const decisaoPropostaSchema = z.object({
  decisao: z.enum(['aprovar', 'rejeitar'], {
    error: 'Escolha aprovar ou rejeitar a proposta.',
  }),
  motivo: z
    .string()
    .trim()
    .min(1, 'Informe o motivo da decisão.')
    .max(10000, 'Use até 10.000 caracteres.'),
});
