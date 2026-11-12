'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Permitido } from '@/shared/auth/permitido';
import { Badge, StatusLoteBadge, StatusPropostaBadge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { formatDataHora } from '@/shared/ui/datas';
import { ErrorState } from '@/shared/ui/empty-state';
import { IconEditar } from '@/shared/ui/icon';
import { LinhaDoTempo } from '@/shared/ui/linha-do-tempo';
import { formatArea, formatMoeda } from '@/shared/ui/masks';
import { PageHeader } from '@/shared/ui/page-header';
import { Panel } from '@/shared/ui/panel';
import { Skeleton } from '@/shared/ui/skeleton';
import { TempoRestante } from '@/shared/ui/tempo-restante';
import { loteDetalheCompletoOptions } from '../api/lotes.queries';
import { AcaoStatusLote } from './acao-status-lote';
import type { QueryKey } from '@tanstack/react-query';
const PARENTS = [
  { label: 'Início', href: '/' },
  { label: 'Lotes', href: '/lotes' },
];
function Dado({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-ink-muted">{titulo}</dt>
      <dd className="mt-1 wrap-anywhere">{children}</dd>
    </div>
  );
}
export function LoteDetalhe({
  id,
  acaoReserva,
  complementoReserva,
  invalidaStatus = [],
}: {
  id: string;
  acaoReserva?: ReactNode;
  complementoReserva?: ReactNode;
  invalidaStatus?: QueryKey[];
}) {
  const query = useQuery(loteDetalheCompletoOptions(id));
  if (!query.isSuccess)
    return (
      <>
        <PageHeader title="Lote" parents={PARENTS} />
        {query.isPending ? (
          <Skeleton aria-label="Carregando detalhe do lote" className="h-96" />
        ) : (
          <ErrorState
            message={getErrorMessage(query.error)}
            action={
              query.error instanceof ApiError &&
              query.error.statusCode === 404 ? (
                <Link href="/lotes" className={buttonClasses('secundario')}>
                  Voltar aos lotes
                </Link>
              ) : (
                <Button
                  variant="secundario"
                  onClick={() => void query.refetch()}
                >
                  Tentar novamente
                </Button>
              )
            }
          />
        )}
      </>
    );
  const { lote, quadra, loteamento, reserva, propostas, historico } =
    query.data;
  const acaoStatus =
    lote.status === 'DISPONIVEL'
      ? 'bloquear'
      : lote.status === 'BLOQUEADO'
        ? 'desbloquear'
        : lote.status === 'RESERVADO' &&
            reserva?.status === 'ATIVA' &&
            propostas.some((proposta) => proposta.status === 'APROVADA')
          ? 'vender'
          : null;
  return (
    <>
      <PageHeader
        title={`Lote ${lote.numero}`}
        description={`${loteamento.nome} · Quadra ${quadra.numero}`}
        parents={PARENTS}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusLoteBadge status={lote.status} />
            {lote.status === 'DISPONIVEL' ? acaoReserva : null}
            {acaoStatus ? (
              <AcaoStatusLote
                loteId={id}
                numeroLote={lote.numero}
                acao={acaoStatus}
                invalidates={invalidaStatus}
              />
            ) : null}
            <Permitido acao="gerenciarCadastros">
              <Link
                href={`/lotes/${id}/editar`}
                className={buttonClasses('secundario')}
              >
                <IconEditar className="size-4" />
                Editar lote
              </Link>
            </Permitido>
          </div>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Panel title="Dados do lote">
            <dl className="grid grid-cols-2 gap-6">
              <Dado titulo="Área">{formatArea(lote.areaM2)}</Dado>
              <Dado titulo="Valor">
                {lote.valor === null
                  ? 'Não informado'
                  : formatMoeda(lote.valor)}
              </Dado>
              <Dado titulo="Loteamento">{loteamento.nome}</Dado>
              <Dado titulo="Quadra">{quadra.numero}</Dado>
            </dl>
            {lote.observacoes ? (
              <div className="mt-6 border-t border-border pt-4">
                <p className="text-caption text-ink-muted">Observações</p>
                <p className="mt-1 whitespace-pre-line wrap-anywhere">
                  {lote.observacoes}
                </p>
              </div>
            ) : null}
          </Panel>
          <Panel title="Propostas">
            {propostas.length ? (
              <ul className="divide-y divide-border">
                {propostas.map((p) => (
                  <li key={p.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-bold">{formatMoeda(p.valor)}</p>
                      <StatusPropostaBadge status={p.status} />
                    </div>
                    <dl className="mt-3 grid gap-3 text-small sm:grid-cols-2">
                      <Dado titulo="Enviada em">
                        {formatDataHora(p.dataEnvio)}
                      </Dado>
                      <Dado
                        titulo={
                          p.dataDecisao ? 'Decidida em' : 'Prazo de análise'
                        }
                      >
                        {formatDataHora(p.dataDecisao ?? p.prazoLimite)}
                      </Dado>
                    </dl>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-ink-muted">
                Nenhuma proposta disponível para consulta.
              </p>
            )}
          </Panel>
        </div>
        <Panel
          title={
            reserva?.status === 'CONVERTIDA' ? 'Reserva da venda' : 'Reserva'
          }
        >
          {reserva ? (
            <>
              <Badge
                tone={reserva.status === 'ATIVA' ? 'reservado' : 'vendido'}
              >
                {reserva.status === 'ATIVA' ? 'Ativa' : 'Convertida em venda'}
              </Badge>
              <dl className="mt-5 grid gap-5">
                <Dado titulo="Cliente">
                  {reserva.cliente.nome ?? 'Cadastro removido'}
                </Dado>
                <Dado titulo="Vendedor">{reserva.vendedor.nome}</Dado>
                <Dado titulo="Início">
                  {formatDataHora(reserva.dataInicio)}
                </Dado>
                <Dado titulo="Vencimento">
                  {formatDataHora(reserva.dataVencimento)}
                </Dado>
              </dl>
              {reserva.status === 'ATIVA' ? (
                <p className="mt-5 border-t border-border pt-4 text-small font-bold">
                  <TempoRestante vencimento={reserva.dataVencimento} />
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-small text-ink-muted">
              Nenhuma reserva disponível para consulta.
            </p>
          )}
          {reserva ? complementoReserva : null}
        </Panel>
      </div>
      <Panel title="Histórico recente">
        <LinhaDoTempo
          itens={historico.map((h) => ({
            id: h.id,
            data: h.createdAt,
            titulo: `${h.entidadeTipo} · ${h.acao.toLowerCase().replaceAll('_', ' ')}`,
          }))}
        />
      </Panel>
    </>
  );
}
