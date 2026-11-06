import { z } from 'zod';
import type { CreateLote, UpdateLote } from '../api/lotes.api';

// Os limites repetem os do backend para dar resposta imediata; quem decide é a API.
// A máscara já entrega `"360.00"`, positivo e com 2 casas: falta conferir o tamanho.
const camposDoLote = {
  numero: z
    .string()
    .trim()
    .min(1, 'Informe o número')
    .max(20, 'Use até 20 caracteres'),
  areaM2: z
    .string()
    .min(1, 'Informe a área')
    .regex(/^\d{1,10}\.\d{2}$/, 'Use até 10 dígitos antes da vírgula'),
  valor: z
    .string()
    .regex(/^(\d{1,12}\.\d{2})?$/, 'Use até 12 dígitos antes da vírgula'),
  exibirValorPublico: z.boolean(),
  observacoes: z.string().trim(),
};

export const loteEdicaoFormSchema = z.object(camposDoLote);

export const loteFormSchema = z.object({
  loteamentoId: z.string().min(1, 'Selecione o loteamento'),
  quadraId: z.string().min(1, 'Selecione a quadra'),
  ...camposDoLote,
});

export type LoteEdicaoFormValues = z.infer<typeof loteEdicaoFormSchema>;
export type LoteFormValues = z.infer<typeof loteFormSchema>;

/** Na API, campo opcional sem valor é `null`, o que também limpa o campo na edição. */
export function toUpdateLote({
  numero,
  areaM2,
  valor,
  exibirValorPublico,
  observacoes,
}: LoteEdicaoFormValues): UpdateLote {
  return {
    numero,
    areaM2,
    valor: valor || null,
    exibirValorPublico,
    observacoes: observacoes || null,
  };
}

/** O loteamento só serve para escolher a quadra: a API o deduz dela. */
export function toCreateLote(values: LoteFormValues): CreateLote {
  return {
    ...toUpdateLote(values),
    quadraId: values.quadraId,
    numero: values.numero,
    areaM2: values.areaM2,
  };
}
