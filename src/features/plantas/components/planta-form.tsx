'use client';

import { useRouter } from 'next/navigation';
import { isAbort } from '@/shared/api/request';
import { Button } from '@/shared/ui/button';
import { Form, FormCheckbox, FormInput } from '@/shared/ui/form';
import { Panel } from '@/shared/ui/panel';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { useToast } from '@/shared/ui/toast';
import { useEnviarPlanta } from '../hooks/use-enviar-planta';
import {
  plantaFormSchema,
  type PlantaFormValues,
} from '../schemas/planta-form.schema';
import { ArquivosPlantaField } from './arquivos-planta-field';

/** A API não associa estes erros a um campo em `details`, ou lista só nomes de fatias. */
const CAMPOS_POR_CODIGO = {
  ARQUIVO_OBRIGATORIO: 'arquivos',
  ARQUIVO_MUITO_GRANDE: 'arquivos',
  PLANTA_FORMATO_INVALIDO: 'arquivos',
  PLANTA_NOME_FATIA_INVALIDO: 'arquivos',
  PLANTA_FATIA_DUPLICADA: 'arquivos',
  PLANTA_GRADE_INCOMPLETA: 'arquivos',
  PLANTA_FATIAS_DIMENSOES_DIFERENTES: 'arquivos',
  PLANTA_MUITO_GRANDE: 'arquivos',
  PLANTA_ATIVA_NAO_ENCONTRADA: 'copiarMarcadores',
} as const;

function ProgressoEnvio({
  progresso,
  onCancelar,
}: {
  progresso: number;
  onCancelar: () => void;
}) {
  const isTudoEnviado = progresso >= 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4 text-small">
        <output>
          {isTudoEnviado
            ? 'Arquivos enviados. Salvando no servidor...'
            : 'Enviando os arquivos...'}
        </output>
        <span className="font-bold tabular-nums">
          {Math.round(progresso * 100)}%
        </span>
      </div>
      <ProgressBar aria-label="Progresso do envio" value={progresso} />
      <Button variant="secundario" onClick={onCancelar} className="self-start">
        Cancelar envio
      </Button>
    </div>
  );
}

export function PlantaForm() {
  const router = useRouter();
  const toast = useToast();
  const { enviar, progresso, cancelar } = useEnviarPlanta();

  async function onSubmit(values: PlantaFormValues) {
    try {
      await enviar(values);
      router.push('/plantas');
    } catch (error) {
      // Cancelar não é falha: não há o que mostrar como erro no formulário.
      if (isAbort(error)) {
        toast({ title: 'Envio cancelado' });
        return;
      }
      throw error;
    }
  }

  return (
    <Panel className="max-w-2xl">
      <Form
        schema={plantaFormSchema}
        defaultValues={{ nome: '', arquivos: [], copiarMarcadores: false }}
        onSubmit={onSubmit}
        submitLabel="Enviar planta"
        cancelHref="/plantas"
        fieldsByCode={CAMPOS_POR_CODIGO}
      >
        <FormInput name="nome" label="Nome" required />
        <ArquivosPlantaField />
        <FormCheckbox
          name="copiarMarcadores"
          label="Copiar os marcadores da planta ativa"
          hint="Se a proporção da imagem mudar, os marcadores copiados ficam sinalizados para revisão."
        />
        {progresso === null ? null : (
          <ProgressoEnvio progresso={progresso} onCancelar={cancelar} />
        )}
      </Form>
    </Panel>
  );
}
