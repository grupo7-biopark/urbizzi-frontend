'use client';

import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useState, type ComponentType } from 'react';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import type { components } from '@/shared/api/schema';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { formatDataHora } from '@/shared/ui/datas';
import { Dialog } from '@/shared/ui/dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { useToast } from '@/shared/ui/toast';
import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { criarReserva } from '../api/reservas.api';
import { previsaoReservaOptions } from '../api/reservas.queries';

type ClienteResumo = components['schemas']['ClienteResumoDto'];
type CamposProps = {
  Busca: ComponentType<{
    value: ClienteResumo | null;
    onChange: (cliente: ClienteResumo | null) => void;
    onCadastrarNovo: () => void;
    listaNoFluxo: boolean;
  }>;
  Cadastro: ComponentType<{
    onSelecionar: (cliente: ClienteResumo) => void;
    onVoltar: () => void;
  }>;
};

function CamposReserva({
  Busca,
  Cadastro,
  confirmar,
  cancelar,
  pendente,
  erro,
}: CamposProps & {
  confirmar: (clienteId: string) => void;
  cancelar: () => void;
  pendente: boolean;
  erro: unknown;
}) {
  const [cliente, setCliente] = useState<ClienteResumo | null>(null);
  const [cadastrando, setCadastrando] = useState(false);
  const previsao = useQuery(previsaoReservaOptions());

  if (cadastrando) {
    return (
      <Cadastro
        onSelecionar={(novo) => {
          setCliente(novo);
          setCadastrando(false);
        }}
        onVoltar={() => setCadastrando(false)}
      />
    );
  }

  return (
    <>
      <fieldset disabled={pendente} className="min-w-0">
        <Busca
          value={cliente}
          onChange={setCliente}
          onCadastrarNovo={() => setCadastrando(true)}
          listaNoFluxo
        />
      </fieldset>
      {previsao.isPending ? (
        <Skeleton
          aria-label="Calculando vencimento previsto"
          className="h-16"
        />
      ) : previsao.isError ? (
        <Alert>
          <div className="space-y-2">
            <p>{getErrorMessage(previsao.error)}</p>
            <Button
              variant="secundario"
              onClick={() => void previsao.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        </Alert>
      ) : (
        <div className="border border-border bg-surface-alt p-3">
          <p className="text-caption text-ink-muted">Vencimento previsto</p>
          <time dateTime={previsao.data.dataVencimento} className="font-bold">
            {formatDataHora(previsao.data.dataVencimento)}
          </time>
          <p className="text-small text-ink-muted">
            {previsao.data.prazoDias}{' '}
            {previsao.data.prazoDias === 1 ? 'dia corrido' : 'dias corridos'} a
            partir da confirmação.
          </p>
        </div>
      )}
      {erro ? <Alert>{getErrorMessage(erro)}</Alert> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secundario" onClick={cancelar} disabled={pendente}>
          Cancelar
        </Button>
        <Button
          loading={pendente}
          disabled={!cliente || !previsao.isSuccess}
          onClick={() => cliente && confirmar(cliente.id)}
        >
          Confirmar reserva
        </Button>
      </div>
    </>
  );
}

export function ReservarLote({
  loteId,
  Busca,
  Cadastro,
  aoReservar,
  invalidates,
}: CamposProps & {
  loteId: string;
  aoReservar: () => Promise<void>;
  invalidates: QueryKey[];
}) {
  const [aberto, setAberto] = useState(false);
  const toast = useToast();
  const reserva = useApiMutation({
    mutationFn: async (clienteId: string) => {
      const criada = await criarReserva({ loteId, clienteId });
      setAberto(false);
      await aoReservar();
      return criada;
    },
    invalidates,
    successMessage: 'Reserva criada',
    errorToast: false,
  });

  function mudarAberto(next: boolean) {
    if (reserva.isPending) return;
    reserva.reset();
    setAberto(next);
  }

  async function confirmar(clienteId: string) {
    try {
      await reserva.mutateAsync(clienteId);
    } catch (error) {
      // useApiMutation já atualiza o detalhe em um 409. O toast permanece
      // visível se o lote ficou indisponível e a ação saiu do cabeçalho.
      if (error instanceof ApiError && error.statusCode === 409) {
        setAberto(false);
        toast({
          title: 'O lote não está mais disponível para reserva',
          variant: 'erro',
        });
      }
    }
  }

  return (
    <Dialog
      title="Reservar lote"
      description="Selecione ou cadastre o cliente para confirmar a reserva."
      trigger={<Button>Reservar</Button>}
      open={aberto}
      onOpenChange={mudarAberto}
    >
      <CamposReserva
        Busca={Busca}
        Cadastro={Cadastro}
        confirmar={(clienteId) => void confirmar(clienteId)}
        cancelar={() => mudarAberto(false)}
        pendente={reserva.isPending}
        erro={reserva.error}
      />
    </Dialog>
  );
}
