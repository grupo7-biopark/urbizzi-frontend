import { z } from 'zod';
import type { CreateProposta } from '../api/propostas.api';

export const propostaFormSchema = z.object({
  valor: z
    .string()
    .regex(
      /^\d{1,12}\.\d{2}$/,
      'Informe um valor com até 12 dígitos antes da vírgula',
    )
    .refine((value) => /[1-9]/.test(value), 'O valor deve ser maior que zero'),
  condicoes: z
    .string()
    .trim()
    .min(1, 'Informe as condições de pagamento')
    .max(10000, 'Use até 10.000 caracteres'),
  observacoes: z.string().trim().max(10000, 'Use até 10.000 caracteres'),
});

export type PropostaFormValues = z.infer<typeof propostaFormSchema>;

export function toCreateProposta(values: PropostaFormValues): CreateProposta {
  return { ...values, observacoes: values.observacoes || null };
}
