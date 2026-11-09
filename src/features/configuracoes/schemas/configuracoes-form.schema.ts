import { z } from 'zod';
import type { Prazos } from '../api/configuracoes.api';

/** Inteiro a partir de 1, como a API exige. O campo é texto: o vazio também é tratado. */
function prazo(mensagemVazio: string) {
  return z
    .string()
    .trim()
    .min(1, mensagemVazio)
    .regex(/^\d+$/, 'Use um número inteiro de dias')
    .transform(Number)
    .refine((dias) => dias >= 1, 'Use pelo menos 1 dia')
    .refine(Number.isSafeInteger, 'Use um número menor');
}

export const configuracoesFormSchema = z.object({
  prazoReservaDias: prazo('Informe o prazo da reserva'),
  prazoAnaliseDiasUteis: prazo('Informe o prazo de análise'),
});

export type ConfiguracoesFormInput = z.input<typeof configuracoesFormSchema>;
export type ConfiguracoesFormValues = z.output<typeof configuracoesFormSchema>;

export function toConfiguracoesForm({
  prazoReservaDias,
  prazoAnaliseDiasUteis,
}: Prazos): ConfiguracoesFormInput {
  return {
    prazoReservaDias: String(prazoReservaDias),
    prazoAnaliseDiasUteis: String(prazoAnaliseDiasUteis),
  };
}
