'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { usePermissao } from '@/shared/auth/use-permissao';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { Dialog } from '@/shared/ui/dialog';
import { Form, FormInput } from '@/shared/ui/form';
import { IconEditar, IconRemover } from '@/shared/ui/icon';
import { Panel } from '@/shared/ui/panel';
import { useListParams } from '@/shared/ui/use-list-params';
import type { Quadra } from '../api/loteamentos.api';
import { quadrasListOptions } from '../api/loteamentos.queries';
import { useCreateQuadra } from '../hooks/use-create-quadra';
import { useDeleteQuadra } from '../hooks/use-delete-quadra';
import { useUpdateQuadra } from '../hooks/use-update-quadra';
import { quadrasSearchSchema } from '../schemas/loteamentos-search.schema';
import {
  quadraFormSchema,
  type QuadraFormValues,
} from '../schemas/quadra-form.schema';

const FIELDS_BY_CODE = { QUADRA_JA_EXISTE: 'numero' } as const;

function CampoNumero() {
  return <FormInput name="numero" label="Número" required maxLength={20} />;
}

function NovaQuadraForm({ loteamentoId }: { loteamentoId: string }) {
  const create = useCreateQuadra(loteamentoId);

  return (
    <div className="max-w-sm">
      <Form
        schema={quadraFormSchema}
        defaultValues={{ numero: '' }}
        onSubmit={(values: QuadraFormValues) => create.mutateAsync(values)}
        submitLabel="Adicionar quadra"
        fieldsByCode={FIELDS_BY_CODE}
        resetAfterSubmit="numero"
      >
        <CampoNumero />
      </Form>
    </div>
  );
}

function EditarQuadra({ quadra }: { quadra: Quadra }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateQuadra(quadra);

  async function handleSubmit(values: QuadraFormValues) {
    await update.mutateAsync(values);
    setOpen(false);
  }

  return (
    <Dialog
      title={`Editar a quadra ${quadra.numero}`}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          variant="fantasma"
          size="compacto"
          aria-label={`Editar a quadra ${quadra.numero}`}
        >
          <IconEditar className="size-4" />
          Editar
        </Button>
      }
    >
      <Form
        schema={quadraFormSchema}
        defaultValues={{ numero: quadra.numero }}
        onSubmit={handleSubmit}
        fieldsByCode={FIELDS_BY_CODE}
      >
        <CampoNumero />
      </Form>
    </Dialog>
  );
}

function RemoverQuadra({ quadra }: { quadra: Quadra }) {
  const remover = useDeleteQuadra(quadra);

  return (
    <ConfirmDialog
      title={`Remover a quadra ${quadra.numero}?`}
      description="Uma quadra com lotes cadastrados não pode ser removida."
      confirmLabel="Remover quadra"
      onConfirm={() => remover.mutateAsync()}
      trigger={
        <Button
          variant="perigoSutil"
          size="compacto"
          aria-label={`Remover a quadra ${quadra.numero}`}
        >
          <IconRemover className="size-4" />
          Remover
        </Button>
      }
    />
  );
}

const COLUNA_NUMERO: DataTableColumn<Quadra> = {
  id: 'numero',
  header: 'Número',
  cell: ({ numero }) => <span className="font-bold">{numero}</span>,
};

const COLUNA_ACOES: DataTableColumn<Quadra> = {
  id: 'acoes',
  header: 'Ações',
  acoes: true,
  cell: (quadra) => (
    <span className="flex gap-1 *:grow md:justify-end md:*:grow-0">
      <EditarQuadra quadra={quadra} />
      <RemoverQuadra quadra={quadra} />
    </span>
  ),
};

export function QuadrasPanel({ loteamentoId }: { loteamentoId: string }) {
  const { params } = useListParams();
  const query = useQuery(
    quadrasListOptions(loteamentoId, quadrasSearchSchema.parse(params)),
  );
  const pode = usePermissao();
  const podeGerenciar = pode('gerenciarCadastros');

  return (
    <Panel title="Quadras">
      <div className="flex flex-col gap-5">
        {podeGerenciar ? <NovaQuadraForm loteamentoId={loteamentoId} /> : null}
        <DataTable
          label="Quadras"
          query={query}
          columns={
            podeGerenciar ? [COLUNA_NUMERO, COLUNA_ACOES] : [COLUNA_NUMERO]
          }
          getRowKey={({ id }) => id}
          emptyTitle="Nenhuma quadra cadastrada"
          emptyDescription={
            podeGerenciar ? 'Adicione a primeira quadra acima.' : undefined
          }
        />
      </div>
    </Panel>
  );
}
