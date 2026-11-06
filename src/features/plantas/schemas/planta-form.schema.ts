import { z } from 'zod';
import { analisarGrade } from './grade-fatias';

export const plantaFormSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Informe o nome')
    .max(150, 'Use até 150 caracteres'),
  arquivos: z
    .array(z.custom<File>())
    .min(1, 'Selecione a imagem da planta ou as fatias')
    .superRefine((arquivos, context) => {
      // Os problemas em si já aparecem na tela assim que os arquivos são escolhidos.
      if (analisarGrade(arquivos).problemas.length > 0) {
        context.addIssue({
          code: 'custom',
          message: 'Corrija os problemas dos arquivos antes de enviar',
        });
      }
    }),
  copiarMarcadores: z.boolean(),
});

export type PlantaFormValues = z.infer<typeof plantaFormSchema>;
