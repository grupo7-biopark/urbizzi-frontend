'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getErrorMessage } from '@/shared/api/errors';
import { Badge, StatusPropostaBadge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { formatDataHora } from '@/shared/ui/datas';
import { EmptyState, ErrorState } from '@/shared/ui/empty-state';
import { LinhaDoTempo } from '@/shared/ui/linha-do-tempo';
import { formatMoeda } from '@/shared/ui/masks';
import { Pagination } from '@/shared/ui/pagination';
import { Panel } from '@/shared/ui/panel';
import { Skeleton } from '@/shared/ui/skeleton';
import type { HistoricoClienteItem } from '../api/clientes.api';
import { clienteHistoricoOptions } from '../api/clientes.queries';
import type { ClientesSearch } from '../schemas/clientes-search.schema';

const STATUS_RESERVA = {
  ATIVA: { label: 'Ativa', tone: 'reservado' },
  CANCELADA: { label: 'Cancelada', tone: 'perigo' },
  EXPIRADA: { label: 'Expirada', tone: 'neutro' },
  CONVERTIDA: { label: 'Convertida', tone: 'vendido' },
} as const;

function Data({ value }: { value: string }) {
  return <time dateTime={value}>{formatDataHora(value)}</time>;
}

function HistoricoItem({ item }: { item: HistoricoClienteItem }) {
  const { reserva, proposta } = item;
  const { lote } = reserva;
  const status = STATUS_RESERVA[reserva.status];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <Link
          href={`/lotes/${lote.id}`}
          className="font-bold wrap-anywhere text-ink underline underline-offset-2"
        >
          Lote {lote.numero}
        </Link>
        <span className="text-small wrap-anywhere text-ink-muted">
          Quadra {lote.quadra} · {lote.loteamento}
        </span>
        {proposta ? (
          <StatusPropostaBadge status={proposta.status} />
        ) : (
          <Badge tone={status.tone}>{status.label}</Badge>
        )}
      </div>
      <dl className="grid gap-x-6 gap-y-3 text-small sm:grid-cols-2">
        {proposta ? (
          <>
            <div>
              <dt className="text-caption text-ink-muted">Valor</dt>
              <dd className="font-bold tabular-nums">
                {formatMoeda(proposta.valor)}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink-muted">Prazo de análise</dt>
              <dd>
                <Data value={proposta.prazoLimite} />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-caption text-ink-muted">Decisão</dt>
              <dd>
                {proposta.decisao ? (
                  <>
                    <Data value={proposta.decisao.data} />
                    <p className="mt-1 whitespace-pre-line wrap-anywhere">
                      {proposta.decisao.motivo}
                    </p>
                  </>
                ) : (
                  'Aguardando decisão'
                )}
              </dd>
            </div>
          </>
        ) : (
          <div>
            <dt className="text-caption text-ink-muted">Vencimento</dt>
            <dd>
              <Data value={reserva.dataVencimento} />
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function ClienteHistorico({
  id,
  search,
}: {
  id: string;
  search: ClientesSearch;
}) {
  const query = useQuery(clienteHistoricoOptions(id, search));
  const getPageHref = (page: number) =>
    `/clientes/${id}?page=${page}&pageSize=${search.pageSize}`;

  return (
    <Panel title="Histórico de reservas e propostas">
      {query.isPending ? (
        <Skeleton aria-label="Carregando histórico" className="h-48" />
      ) : query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          action={
            <Button variant="secundario" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : query.data.meta.total === 0 ? (
        <EmptyState
          bare
          title="Nenhuma reserva ou proposta no histórico"
          description="As reservas e propostas disponíveis para você aparecerão aqui."
        />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          bare
          title="Nenhum registro nesta página"
          action={
            <Link href={getPageHref(1)} className={buttonClasses('secundario')}>
              Voltar à primeira página
            </Link>
          }
        />
      ) : (
        <>
          <LinhaDoTempo
            itens={query.data.data.map((item) => ({
              id: `${item.tipo}-${item.id}`,
              data: item.data,
              titulo:
                item.tipo === 'PROPOSTA'
                  ? 'Proposta enviada'
                  : 'Reserva iniciada',
              detalhe: <HistoricoItem item={item} />,
            }))}
          />
          <Pagination
            label="Paginação do histórico"
            className="mt-5"
            meta={query.data.meta}
            getPageHref={getPageHref}
          />
        </>
      )}
    </Panel>
  );
}
