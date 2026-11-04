'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';
import { apiErrorFromResponse } from '@/shared/api/errors';
import type { Paginated } from '@/shared/api/pagination';
import { StatusLoteBadge, type StatusLote } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { Form, FormInput, FormMaskedInput } from '@/shared/ui/form';
import {
  FilterBar,
  UrlSearchFilter,
  UrlSelectFilter,
} from '@/shared/ui/list-filters';
import { formatArea, formatMoeda } from '@/shared/ui/masks';
import { useToast } from '@/shared/ui/toast';
import { useListParams } from '@/shared/ui/use-list-params';

// Dados fictícios em memória: o catálogo não depende do backend nem de sessão.
type LoteDemo = {
  id: string;
  numero: string;
  status: StatusLote;
  areaM2: string;
  valor: string | null;
};

const STATUS: StatusLote[] = [
  'DISPONIVEL',
  'RESERVADO',
  'VENDIDO',
  'BLOQUEADO',
];
const PAGE_SIZE = 5;

const LOTES: LoteDemo[] = Array.from({ length: 23 }, (_, index) => ({
  id: String(index + 1),
  numero: `Lote ${index + 1}`,
  status: STATUS[index % STATUS.length] ?? 'DISPONIVEL',
  areaM2: `${360 + index}.50`,
  valor: index % 5 === 4 ? null : `${250000 + index * 1000}.00`,
}));

const COLUNAS: DataTableColumn<LoteDemo>[] = [
  { id: 'numero', header: 'Número', cell: (lote) => lote.numero },
  {
    id: 'status',
    header: 'Status',
    cell: (lote) => <StatusLoteBadge status={lote.status} />,
  },
  { id: 'area', header: 'Área', cell: (lote) => formatArea(lote.areaM2) },
  {
    id: 'valor',
    header: 'Valor',
    cell: (lote) => formatMoeda(lote.valor) || 'Não definido',
  },
];

// `.catch()` evita que uma URL editada à mão derrube a tela.
const searchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  q: z.string().optional().catch(undefined),
  status: z.string().optional().catch(undefined),
});

type Search = z.infer<typeof searchSchema>;

function listLotesDemo({ page, q, status }: Search): Paginated<LoteDemo> {
  const filtrados = LOTES.filter(
    (lote) =>
      (!q || lote.numero.toLowerCase().includes(q.toLowerCase())) &&
      (!status || lote.status === status),
  );

  return {
    data: filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    meta: {
      page,
      pageSize: PAGE_SIZE,
      total: filtrados.length,
      totalPages: Math.ceil(filtrados.length / PAGE_SIZE),
    },
  };
}

export function ListagemExemplo() {
  const { params } = useListParams();
  const search = searchSchema.parse(params);
  const query = useQuery({
    queryKey: ['design-system', 'lotes', search],
    queryFn: () => Promise.resolve(listLotesDemo(search)),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <UrlSearchFilter label="Buscar lote" />
        <UrlSelectFilter
          name="status"
          label="Status"
          options={[
            { value: 'DISPONIVEL', label: 'Disponível' },
            { value: 'RESERVADO', label: 'Reservado' },
            { value: 'VENDIDO', label: 'Vendido' },
            { value: 'BLOQUEADO', label: 'Bloqueado' },
          ]}
        />
      </FilterBar>
      <DataTable
        label="Lotes de exemplo"
        query={query}
        columns={COLUNAS}
        getRowKey={(lote) => lote.id}
        emptyTitle="Nenhum lote cadastrado"
      />
    </div>
  );
}

const formSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome'),
  documento: z.string(),
  telefone: z.string(),
  valor: z.string(),
  areaM2: z.string(),
});

export function FormularioExemplo() {
  const toast = useToast();

  /** Simula a API: o nome "Erro" responde como um `DADOS_INVALIDOS` de verdade. */
  function salvar({ nome }: z.output<typeof formSchema>) {
    if (nome === 'Erro') {
      return Promise.reject(
        apiErrorFromResponse(400, {
          code: 'DADOS_INVALIDOS',
          message: 'Os dados enviados são inválidos',
          details: [{ field: 'documento', messages: ['Documento inválido'] }],
        }),
      );
    }

    toast({ title: 'Salvo com sucesso', variant: 'sucesso' });
    return Promise.resolve();
  }

  return (
    <div className="max-w-md">
      <Form
        schema={formSchema}
        defaultValues={{
          nome: '',
          documento: '',
          telefone: '',
          valor: '',
          areaM2: '',
        }}
        onSubmit={salvar}
      >
        <FormInput
          name="nome"
          label="Nome"
          required
          hint='Use "Erro" para ver um erro de campo vindo da API.'
        />
        <FormMaskedInput name="documento" label="CPF ou CNPJ" mask="cpfCnpj" />
        <FormMaskedInput name="telefone" label="Telefone" mask="telefone" />
        <FormMaskedInput name="valor" label="Valor" mask="moeda" />
        <FormMaskedInput name="areaM2" label="Área (m²)" mask="area" />
      </Form>
    </div>
  );
}

export function ConfirmacaoExemplo() {
  const toast = useToast();
  const [cancelada, setCancelada] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <ConfirmDialog
        title="Cancelar a reserva do lote 12?"
        description="O lote volta a ficar disponível."
        confirmLabel="Cancelar reserva"
        motivo={{ required: true }}
        onConfirm={() => {
          setCancelada(true);
          toast({ title: 'Reserva cancelada', variant: 'sucesso' });
        }}
        trigger={<Button variant="perigo">Abrir confirmação</Button>}
      />
      {cancelada ? <span>Reserva cancelada.</span> : null}
    </div>
  );
}
