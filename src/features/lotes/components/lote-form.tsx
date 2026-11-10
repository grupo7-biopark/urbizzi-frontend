'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DemarcacaoLote, DemarcacaoNovoLote } from './demarcacao-lote';
import { useController, useWatch } from 'react-hook-form';
import { getErrorMessage } from '@/shared/api/errors';
import { StatusLoteBadge } from '@/shared/ui/badge';
import {
  Form,
  FormCheckbox,
  FormInput,
  FormMaskedInput,
  FormTextarea,
} from '@/shared/ui/form';
import { Panel } from '@/shared/ui/panel';
import { Select } from '@/shared/ui/select';
import type { Lote } from '../api/lotes.api';
import {
  loteamentosOpcoesOptions,
  quadrasOpcoesOptions,
} from '../api/lotes.queries';
import { useCreateLote } from '../hooks/use-create-lote';
import { useUpdateLote } from '../hooks/use-update-lote';
import {
  loteEdicaoFormSchema,
  loteFormSchema,
  toCreateLote,
  toUpdateLote,
  type LoteEdicaoFormValues,
  type LoteFormValues,
} from '../schemas/lote-form.schema';
import { NomeLoteamento, NumeroQuadra } from './nomes-do-lote';

const FIELDS_BY_CODE = {
  LOTE_JA_EXISTE: 'numero',
  QUADRA_NAO_ENCONTRADA: 'quadraId',
} as const;

function CamposDoLote() {
  return (
    <>
      <FormInput name="numero" label="Número" required maxLength={20} />
      <FormMaskedInput name="areaM2" label="Área (m²)" mask="area" required />
      <FormMaskedInput name="valor" label="Valor" mask="moeda" />
      <FormCheckbox
        name="exibirValorPublico"
        label="Exibir o valor no link público"
      />
      <FormTextarea name="observacoes" label="Observações" />
    </>
  );
}

/** A lista de quadras depende do loteamento, e trocar de loteamento limpa a quadra. */
function CamposDeLocalizacao() {
  const loteamento = useController({ name: 'loteamentoId' });
  const quadra = useController({ name: 'quadraId' });
  const loteamentoId = useWatch({ name: 'loteamentoId' }) as string;
  const loteamentos = useQuery(loteamentosOpcoesOptions());
  const quadras = useQuery(quadrasOpcoesOptions(loteamentoId || undefined));

  return (
    <>
      <Select
        {...loteamento.field}
        onChange={(event) => {
          loteamento.field.onChange(event);
          quadra.field.onChange('');
        }}
        label="Loteamento"
        required
        error={
          loteamento.fieldState.error?.message ??
          (loteamentos.isError ? getErrorMessage(loteamentos.error) : undefined)
        }
      >
        <option value="">Selecione</option>
        {loteamentos.data?.data.map(({ id, nome }) => (
          <option key={id} value={id}>
            {nome}
          </option>
        ))}
      </Select>
      <Select
        {...quadra.field}
        label="Quadra"
        required
        disabled={!loteamentoId}
        hint={loteamentoId ? undefined : 'Selecione o loteamento primeiro.'}
        error={
          quadra.fieldState.error?.message ??
          (quadras.isError ? getErrorMessage(quadras.error) : undefined)
        }
      >
        <option value="">Selecione</option>
        {quadras.data?.data.map(({ id, numero }) => (
          <option key={id} value={id}>
            {numero}
          </option>
        ))}
      </Select>
    </>
  );
}

export function NovoLoteForm() {
  const router = useRouter();
  const create = useCreateLote();
  const [vertices, setVertices] = useState<{
    parent: string;
    value: number[][] | null;
  }>();

  async function handleSubmit(values: LoteFormValues) {
    await create.mutateAsync({
      ...toCreateLote(values),
      vertices:
        vertices?.parent === values.quadraId ? vertices.value : undefined,
    });
    router.push('/lotes');
  }

  return (
    <Panel className="max-w-5xl">
      <Form
        schema={loteFormSchema}
        defaultValues={{
          loteamentoId: '',
          quadraId: '',
          numero: '',
          areaM2: '',
          valor: '',
          exibirValorPublico: false,
          observacoes: '',
        }}
        onSubmit={handleSubmit}
        cancelHref="/lotes"
        fieldsByCode={FIELDS_BY_CODE}
      >
        <CamposDeLocalizacao />
        <CamposDoLote />
        <DemarcacaoNovoLote
          vertices={vertices}
          onChange={(parent, value) => setVertices({ parent, value })}
        />
      </Form>
    </Panel>
  );
}

function Dado({
  termo,
  children,
}: {
  termo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-ink-muted">{termo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Quadra e status não mudam aqui: a quadra é fixa, e o status segue os fluxos do lote. */
export function EditarLoteForm({ lote }: { lote: Lote }) {
  const router = useRouter();
  const update = useUpdateLote(lote.id);
  const [vertices, setVertices] = useState<number[][] | null>();

  async function handleSubmit(values: LoteEdicaoFormValues) {
    await update.mutateAsync({ ...toUpdateLote(values), vertices });
    router.push('/lotes');
  }

  return (
    <Panel className="max-w-5xl">
      <div className="flex flex-col gap-5">
        <dl className="grid gap-5 sm:grid-cols-3">
          <Dado termo="Loteamento">
            <NomeLoteamento id={lote.loteamentoId} />
          </Dado>
          <Dado termo="Quadra">
            <NumeroQuadra id={lote.quadraId} />
          </Dado>
          <Dado termo="Status">
            <StatusLoteBadge status={lote.status} />
          </Dado>
        </dl>
        <Form
          schema={loteEdicaoFormSchema}
          defaultValues={{
            numero: lote.numero,
            areaM2: lote.areaM2,
            valor: lote.valor ?? '',
            exibirValorPublico: lote.exibirValorPublico,
            observacoes: lote.observacoes ?? '',
          }}
          onSubmit={handleSubmit}
          cancelHref="/lotes"
          fieldsByCode={{ LOTE_JA_EXISTE: 'numero' }}
        >
          <CamposDoLote />
          <DemarcacaoLote
            id={lote.id}
            loteamentoId={lote.loteamentoId}
            quadraId={lote.quadraId}
            vertices={vertices}
            onChange={setVertices}
          />
        </Form>
      </div>
    </Panel>
  );
}
