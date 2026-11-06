'use client';

import { useRouter } from 'next/navigation';
import { Form, FormInput, FormTextarea } from '@/shared/ui/form';
import { Panel } from '@/shared/ui/panel';
import type { Loteamento } from '../api/loteamentos.api';
import { useCreateLoteamento } from '../hooks/use-create-loteamento';
import { useUpdateLoteamento } from '../hooks/use-update-loteamento';
import {
  loteamentoFormSchema,
  toLoteamentoBody,
  type LoteamentoFormValues,
} from '../schemas/loteamento-form.schema';

const FIELDS_BY_CODE = { LOTEAMENTO_JA_EXISTE: 'nome' } as const;

function Campos() {
  return (
    <>
      <FormInput name="nome" label="Nome" required maxLength={150} />
      <FormTextarea name="descricao" label="Descrição" />
      <FormInput name="localizacao" label="Localização" maxLength={255} />
    </>
  );
}

export function NovoLoteamentoForm() {
  const router = useRouter();
  const create = useCreateLoteamento();

  async function handleSubmit(values: LoteamentoFormValues) {
    const { id } = await create.mutateAsync(toLoteamentoBody(values));
    router.push(`/loteamentos/${id}`);
  }

  return (
    <Panel className="max-w-2xl">
      <Form
        schema={loteamentoFormSchema}
        defaultValues={{ nome: '', descricao: '', localizacao: '' }}
        onSubmit={handleSubmit}
        cancelHref="/loteamentos"
        fieldsByCode={FIELDS_BY_CODE}
      >
        <Campos />
      </Form>
    </Panel>
  );
}

export function EditarLoteamentoForm({
  loteamento,
}: {
  loteamento: Loteamento;
}) {
  const router = useRouter();
  const update = useUpdateLoteamento(loteamento.id);
  const detalheHref = `/loteamentos/${loteamento.id}`;

  async function handleSubmit(values: LoteamentoFormValues) {
    await update.mutateAsync(toLoteamentoBody(values));
    router.push(detalheHref);
  }

  return (
    <Panel className="max-w-2xl">
      <Form
        schema={loteamentoFormSchema}
        defaultValues={{
          nome: loteamento.nome,
          descricao: loteamento.descricao ?? '',
          localizacao: loteamento.localizacao ?? '',
        }}
        onSubmit={handleSubmit}
        cancelHref={detalheHref}
        fieldsByCode={FIELDS_BY_CODE}
      >
        <Campos />
      </Form>
    </Panel>
  );
}
