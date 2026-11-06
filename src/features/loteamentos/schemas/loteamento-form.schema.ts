import { z } from 'zod';

// Os limites repetem os do backend para dar resposta imediata; quem decide é a API.
export const loteamentoFormSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Informe o nome')
    .max(150, 'Use até 150 caracteres'),
  descricao: z.string().trim(),
  localizacao: z.string().trim().max(255, 'Use até 255 caracteres'),
});

export type LoteamentoFormValues = z.infer<typeof loteamentoFormSchema>;

/** Na API, campo opcional sem valor é `null`, o que também limpa o campo na edição. */
export function toLoteamentoBody(values: LoteamentoFormValues) {
  return {
    nome: values.nome,
    descricao: values.descricao || null,
    localizacao: values.localizacao || null,
  };
}
