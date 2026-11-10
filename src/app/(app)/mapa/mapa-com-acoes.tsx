'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { clientesKeys } from '@/features/clientes/api/clientes.queries';
import { AcaoStatusLote } from '@/features/lotes/components/acao-status-lote';
import {
  loteDetalheCompletoOptions,
  lotesKeys,
} from '@/features/lotes/api/lotes.queries';
import { MapaInterno } from '@/features/mapa/components/mapa-interno';
import type { MarcadorMapa } from '@/features/mapa/api/mapa.api';
import { mapaKeys } from '@/features/mapa/api/mapa.queries';
import type { MapaSearch } from '@/features/mapa/schemas/mapa-search.schema';
import { CriarProposta } from '@/features/propostas/components/criar-proposta';
import { RenovarReserva } from '@/features/reservas/components/renovar-reserva';
import { CancelarReserva } from '@/features/reservas/components/cancelar-reserva';
import { getErrorMessage } from '@/shared/api/errors';
import { Permitido } from '@/shared/auth/permitido';
import { StatusLoteBadge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { formatDataHora } from '@/shared/ui/datas';
import { Dialog } from '@/shared/ui/dialog';
import { ErrorState } from '@/shared/ui/empty-state';
import { formatArea, formatMoeda } from '@/shared/ui/masks';
import { Skeleton } from '@/shared/ui/skeleton';
import { TempoRestante } from '@/shared/ui/tempo-restante';
import { AcaoReserva } from '../lotes/[id]/acao-reserva';

const INVALIDATES = [
  lotesKeys.all,
  mapaKeys.all,
  ['reservas'],
  ['propostas'],
  clientesKeys.historicos(),
];

function AcoesLoteMapa({ marcador }: { marcador: MarcadorMapa }) {
  const query = useQuery(loteDetalheCompletoOptions(marcador.loteId));
  const [verReserva, setVerReserva] = useState(false);
  if (query.isPending)
    return <Skeleton aria-label="Carregando ações do lote" className="h-40" />;
  if (query.isError)
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        action={
          <Button onClick={() => void query.refetch()} variant="secundario">
            Tentar novamente
          </Button>
        }
      />
    );
  const { lote, loteamento, quadra, reserva, propostas } = query.data;
  const dadosReserva = reserva
    ? {
        id: reserva.id,
        status: reserva.status,
        vendedorId: reserva.vendedor.id,
        dataVencimento: reserva.dataVencimento,
      }
    : undefined;
  const podeVerReserva = marcador.acoes.includes('verReserva') && reserva;
  const temProposta = propostas.some(
    (proposta) =>
      proposta.status === 'EM_ANALISE' || proposta.status === 'APROVADA',
  );

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-caption text-ink-muted">Quadra</dt>
          <dd>{quadra.numero}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-muted">Loteamento</dt>
          <dd>{loteamento.nome}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-muted">Área</dt>
          <dd>{formatArea(lote.areaM2)}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-muted">Valor</dt>
          <dd>{lote.valor ? formatMoeda(lote.valor) : 'Não definido'}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-muted">Status</dt>
          <dd>
            <StatusLoteBadge status={lote.status} />
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2" aria-label="Ações do lote">
        <Link
          href={`/lotes/${lote.id}`}
          className={buttonClasses('secundario')}
        >
          Ver detalhes do lote
        </Link>
        {marcador.acoes.includes('reservar') && lote.status === 'DISPONIVEL' ? (
          <Permitido acao="gerenciarReservas">
            <AcaoReserva id={lote.id} />
          </Permitido>
        ) : null}
        {podeVerReserva ? (
          <Button variant="secundario" onClick={() => setVerReserva(true)}>
            Ver reserva
          </Button>
        ) : null}
        {podeVerReserva && dadosReserva ? (
          <CriarProposta
            reservaId={dadosReserva.id}
            vendedorId={dadosReserva.vendedorId}
            numeroLote={lote.numero}
            vencimentoReserva={dadosReserva.dataVencimento}
            disponivel={dadosReserva.status === 'ATIVA' && !temProposta}
            invalidates={INVALIDATES}
          />
        ) : null}
        {marcador.acoes.includes('vender') && lote.status === 'RESERVADO' ? (
          <AcaoStatusLote
            loteId={lote.id}
            numeroLote={lote.numero}
            acao="vender"
            invalidates={INVALIDATES}
          />
        ) : null}
        {marcador.acoes.includes('bloquear') && lote.status === 'DISPONIVEL' ? (
          <AcaoStatusLote
            loteId={lote.id}
            numeroLote={lote.numero}
            acao="bloquear"
            invalidates={INVALIDATES}
          />
        ) : null}
        {marcador.acoes.includes('desbloquear') &&
        lote.status === 'BLOQUEADO' ? (
          <AcaoStatusLote
            loteId={lote.id}
            numeroLote={lote.numero}
            acao="desbloquear"
            invalidates={INVALIDATES}
          />
        ) : null}
      </div>
      <Dialog
        title={`Reserva do lote ${lote.numero}`}
        open={verReserva}
        onOpenChange={setVerReserva}
      >
        {reserva && dadosReserva ? (
          <>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-caption text-ink-muted">Cliente</dt>
                <dd>{reserva.cliente.nome ?? 'Cadastro removido'}</dd>
              </div>
              <div>
                <dt className="text-caption text-ink-muted">Vendedor</dt>
                <dd>{reserva.vendedor.nome}</dd>
              </div>
              <div>
                <dt className="text-caption text-ink-muted">Vencimento</dt>
                <dd>{formatDataHora(reserva.dataVencimento)}</dd>
              </div>
            </dl>
            <TempoRestante vencimento={reserva.dataVencimento} />
            <div className="flex flex-wrap gap-2">
              <RenovarReserva
                reserva={dadosReserva}
                numeroLote={lote.numero}
                invalidates={INVALIDATES}
              />
              <CancelarReserva
                reserva={dadosReserva}
                numeroLote={lote.numero}
                temProposta={temProposta}
                invalidates={INVALIDATES}
              />
            </div>
          </>
        ) : (
          <p>A reserva não está mais disponível para consulta.</p>
        )}
      </Dialog>
    </div>
  );
}

function renderPainelLote(marcador: MarcadorMapa) {
  return <AcoesLoteMapa key={marcador.loteId} marcador={marcador} />;
}

export function MapaComAcoes({ search }: { search: MapaSearch }) {
  const queryClient = useQueryClient();

  return (
    <MapaInterno
      search={search}
      renderPainelLote={renderPainelLote}
      aoSincronizar={(loteId) => {
        // A gaveta lê o detalhe completo, que não está no cache do mapa.
        void queryClient.invalidateQueries({
          queryKey: loteId ? lotesKeys.detail(loteId) : lotesKeys.details(),
        });
      }}
    />
  );
}
