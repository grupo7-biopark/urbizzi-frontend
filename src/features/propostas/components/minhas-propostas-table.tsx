'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge, StatusPropostaBadge } from '@/shared/ui/badge';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { formatDataHora } from '@/shared/ui/datas';
import { formatMoeda } from '@/shared/ui/masks';
import { TempoRestante } from '@/shared/ui/tempo-restante';
import type { Proposta } from '../api/propostas.api';
import { minhasPropostasOptions } from '../api/propostas.queries';
import type { PropostasSearch } from '../schemas/propostas-search.schema';

const COLUNAS: DataTableColumn<Proposta>[] = [
  {
    id: 'valor',
    header: 'Valor proposto',
    cell: ({ valor }) => (
      <span className="whitespace-nowrap font-bold tabular-nums">
        {formatMoeda(valor)}
      </span>
    ),
  },
  {
    id: 'condicoes',
    header: 'Condições e observações',
    cell: ({ condicoes, observacoes }) => (
      <div className="flex flex-col gap-2 whitespace-pre-line wrap-anywhere">
        <p>{condicoes}</p>
        {observacoes ? (
          <p className="text-small text-ink-muted">{observacoes}</p>
        ) : null}
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ status }) => <StatusPropostaBadge status={status} />,
  },
  {
    id: 'prazo',
    header: 'Prazo de análise',
    cell: ({ prazoLimite, status, atrasada }) => (
      <div className="flex flex-col items-start gap-2">
        <time dateTime={prazoLimite}>{formatDataHora(prazoLimite)}</time>
        {status === 'EM_ANALISE' ? (
          atrasada ? (
            <Badge tone="perigo">Em atraso</Badge>
          ) : (
            <TempoRestante vencimento={prazoLimite} />
          )
        ) : null}
      </div>
    ),
  },
  {
    id: 'decisao',
    header: 'Decisão e motivo',
    cell: ({ status, dataDecisao, motivoDecisao }) =>
      status === 'EM_ANALISE' ? (
        'Aguardando análise'
      ) : (
        <div className="flex flex-col gap-2">
          {dataDecisao ? (
            <time dateTime={dataDecisao}>{formatDataHora(dataDecisao)}</time>
          ) : null}
          <p className="whitespace-pre-line wrap-anywhere">
            {motivoDecisao || 'Motivo não informado'}
          </p>
        </div>
      ),
  },
];

export function MinhasPropostasTable({ search }: { search: PropostasSearch }) {
  const query = useQuery(minhasPropostasOptions(search));
  return (
    <DataTable
      label="Minhas propostas"
      query={query}
      columns={COLUNAS}
      getRowKey={({ id }) => id}
      emptyTitle="Você ainda não enviou propostas"
      emptyDescription="Crie uma proposta a partir de uma reserva ativa."
    />
  );
}
