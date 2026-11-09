'use client';

import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getErrorMessage } from '@/shared/api/errors';
import { Permitido } from '@/shared/auth/permitido';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { formatDataHora } from '@/shared/ui/datas';
import { Dialog } from '@/shared/ui/dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import type { Reserva } from '../api/reservas-acoes.api';
import { previsaoReservaOptions } from '../api/reservas.queries';
import { useRenovarReserva } from '../hooks/use-acoes-reserva';

export function RenovarReserva({
  reserva,
  numeroLote,
  invalidates,
}: {
  reserva: Pick<Reserva, 'id' | 'status' | 'vendedorId' | 'dataVencimento'>;
  numeroLote: string;
  invalidates: QueryKey[];
}) {
  const [aberto, setAberto] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [erro, setErro] = useState<unknown>();
  const prazo = useQuery({ ...previsaoReservaOptions(), enabled: aberto });
  const renovar = useRenovarReserva(invalidates);
  const podeRenovar =
    reserva.status === 'ATIVA' &&
    new Date(reserva.dataVencimento).getTime() > agora;
  const novoVencimento = prazo.data
    ? new Date(
        new Date(reserva.dataVencimento).getTime() +
          prazo.data.prazoDias * 86400000,
      ).toISOString()
    : undefined;

  async function confirmar() {
    if (!novoVencimento || !podeRenovar) return;
    setErro(undefined);
    try {
      await renovar.mutateAsync(reserva.id);
      setAberto(false);
    } catch (cause) {
      setErro(cause);
    }
  }

  return (
    <Permitido acao="gerenciarReservas" donoId={reserva.vendedorId}>
      {podeRenovar ? (
        <Button
          variant="secundario"
          onClick={() => {
            setErro(undefined);
            setAberto(true);
          }}
        >
          Renovar
        </Button>
      ) : null}
      <Dialog
        title={`Renovar a reserva do lote ${numeroLote}?`}
        open={aberto}
        onOpenChange={(next) => {
          if (!renovar.isPending) setAberto(next);
        }}
        footer={
          <>
            <Button
              variant="secundario"
              disabled={renovar.isPending}
              onClick={() => setAberto(false)}
            >
              Voltar
            </Button>
            <Button
              loading={renovar.isPending}
              disabled={!novoVencimento || !podeRenovar || prazo.isError}
              onClick={() => void confirmar()}
            >
              Confirmar renovação
            </Button>
          </>
        }
      >
        <p>Vencimento atual: {formatDataHora(reserva.dataVencimento)}.</p>
        {prazo.isPending ? (
          <Skeleton className="h-6 w-full" aria-label="Consultando prazo" />
        ) : null}
        {prazo.isError ? (
          <>
            <Alert>{getErrorMessage(prazo.error)}</Alert>
            <Button variant="secundario" onClick={() => void prazo.refetch()}>
              Tentar novamente
            </Button>
          </>
        ) : null}
        {novoVencimento ? (
          <p>
            Novo vencimento previsto:{' '}
            <strong>{formatDataHora(novoVencimento)}</strong>. O prazo e o
            limite são conferidos novamente ao confirmar.
          </p>
        ) : null}
        {erro ? <Alert>{getErrorMessage(erro)}</Alert> : null}
      </Dialog>
    </Permitido>
  );
}
