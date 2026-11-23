'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import { z } from 'zod';
import { usePermissao } from '@/shared/auth/use-permissao';
import { Alert } from '@/shared/ui/alert';
import { Badge, StatusPropostaBadge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { formatDataHora } from '@/shared/ui/datas';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { FilterBar, UrlSelectFilter } from '@/shared/ui/list-filters';
import { formatMoeda } from '@/shared/ui/masks';
import { TempoRestante } from '@/shared/ui/tempo-restante';
import { useListParams } from '@/shared/ui/use-list-params';
import type { ReservaResumo } from '../api/reservas-consulta.api';
import {
  loteamentosReservasOptions,
  reservasListOptions,
  vendedoresReservasOptions,
} from '../api/reservas-consulta.queries';
import {
  periodoInvertido,
  toListReservasQuery,
  type ReservasSearch,
} from '../schemas/reservas-search.schema';

const STATUS = {
  ATIVA: 'Ativa',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada',
  CONVERTIDA: 'Convertida',
} as const;

const COLUNAS: DataTableColumn<ReservaResumo>[] = [
  {
    id: 'lote',
    header: 'Lote',
    cell: ({ lote }) => (
      <Link className="font-bold underline" href={`/lotes/${lote.id}`}>
        Lote {lote.numero} · Quadra {lote.quadra} · {lote.loteamento}
      </Link>
    ),
  },
  {
    id: 'cliente',
    header: 'Cliente',
    cell: ({ cliente }) => cliente.nome ?? 'Cliente removido',
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ status }) => (
      <Badge tone={status === 'ATIVA' ? 'reservado' : 'neutro'}>
        {STATUS[status]}
      </Badge>
    ),
  },
  {
    id: 'vencimento',
    header: 'Vencimento',
    cell: ({ dataVencimento, status }) => (
      <div className="flex flex-col gap-1">
        <time dateTime={dataVencimento}>{formatDataHora(dataVencimento)}</time>
        {status === 'ATIVA' ? (
          <TempoRestante vencimento={dataVencimento} />
        ) : null}
      </div>
    ),
  },
  {
    id: 'proposta',
    header: 'Proposta atual',
    cell: ({ propostaAtual }) =>
      propostaAtual ? (
        <div className="flex flex-wrap gap-2">
          <StatusPropostaBadge status={propostaAtual.status} />
          <span>{formatMoeda(propostaAtual.valor)}</span>
        </div>
      ) : (
        'Sem proposta'
      ),
  },
];

function PeriodoVendedor({
  search,
  todas,
}: {
  search: ReservasSearch;
  todas: boolean;
}) {
  const { setParams } = useListParams();
  const [erro, setErro] = useState<string>();
  const vendedores = useQuery(vendedoresReservasOptions(todas));

  function aplicar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    const de = String(dados.get('vencimentoDe') ?? '');
    const ate = String(dados.get('vencimentoAte') ?? '');
    const vendedorId = todas
      ? String(dados.get('vendedorId') ?? '').trim()
      : '';
    if (vendedorId && !z.uuid().safeParse(vendedorId).success) {
      setErro('Informe um identificador válido para o vendedor.');
      return;
    }
    if (de && ate && de > ate) {
      setErro('O vencimento final deve ser igual ou posterior ao inicial.');
      return;
    }
    setErro(undefined);
    setParams({ vencimentoDe: de, vencimentoAte: ate, vendedorId });
  }

  return (
    <form
      onSubmit={aplicar}
      aria-label="Período e vendedor"
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <Input
          label="Vencimento de"
          name="vencimentoDe"
          type="date"
          defaultValue={search.vencimentoDe ?? ''}
        />
        <Input
          label="Vencimento até"
          name="vencimentoAte"
          type="date"
          defaultValue={search.vencimentoAte ?? ''}
        />
        {todas ? (
          <Select
            label="Vendedor"
            name="vendedorId"
            defaultValue={search.vendedorId ?? ''}
            disabled={vendedores.isPending || vendedores.isError}
            error={
              vendedores.isError
                ? 'Não foi possível carregar os vendedores.'
                : undefined
            }
          >
            <option value="">Todos os vendedores</option>
            {search.vendedorId &&
            !vendedores.data?.some((v) => v.id === search.vendedorId) ? (
              <option value={search.vendedorId}>Vendedor selecionado</option>
            ) : null}
            {vendedores.data?.map(({ id, nome }) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </Select>
        ) : null}
        {todas && vendedores.isError ? (
          <Button variant="fantasma" onClick={() => void vendedores.refetch()}>
            Tentar carregar vendedores
          </Button>
        ) : null}
        <Button type="submit" variant="secundario">
          Aplicar filtros
        </Button>
      </div>
      {erro ? <Alert>{erro}</Alert> : null}
    </form>
  );
}

function criarColunas(
  minhas: boolean,
  pode: ReturnType<typeof usePermissao>,
  renderAcoes?: (reserva: ReservaResumo) => ReactNode,
): DataTableColumn<ReservaResumo>[] {
  const colunas = [...COLUNAS];
  if (!minhas)
    colunas.push({
      id: 'vendedor',
      header: 'Vendedor',
      cell: ({ vendedorNome }) => (
        <span className="wrap-anywhere">{vendedorNome}</span>
      ),
    });
  colunas.push({
    id: 'acoes',
    header: 'Ações',
    acoes: true,
    cell: (reserva) => (
      <div className="flex flex-wrap gap-2">
        <Link
          className={buttonClasses('fantasma', undefined, 'compacto')}
          href={`/lotes/${reserva.lote.id}`}
        >
          Ver reserva
        </Link>
        {reserva.status === 'ATIVA' &&
        pode('gerenciarReservas', { donoId: reserva.vendedorId })
          ? renderAcoes?.(reserva)
          : null}
      </div>
    ),
  });
  return colunas;
}

export function ReservasTable({
  search,
  verTodas,
  renderAcoes,
}: {
  search: ReservasSearch;
  verTodas: boolean;
  renderAcoes?: (reserva: ReservaResumo) => ReactNode;
}) {
  const pode = usePermissao();
  const minhas = !verTodas || search.minhas === 'true';
  const { getHref } = useListParams();
  const intervaloInvalido = periodoInvertido(search);
  const query = useQuery({
    ...reservasListOptions(toListReservasQuery(search, minhas), minhas),
    enabled: !intervaloInvalido,
  });
  const loteamentos = useQuery(loteamentosReservasOptions());
  const colunas = criarColunas(minhas, pode, renderAcoes);

  return (
    <>
      {verTodas ? (
        <nav aria-label="Visão das reservas" className="flex flex-wrap gap-2">
          <Link
            href={getHref({ minhas: 'false', vendedorId: '' })}
            aria-current={!minhas ? 'page' : undefined}
            className={buttonClasses(!minhas ? 'primario' : 'secundario')}
          >
            Todas as reservas
          </Link>
          <Link
            href={getHref({ minhas: 'true', vendedorId: '' })}
            aria-current={minhas ? 'page' : undefined}
            className={buttonClasses(minhas ? 'primario' : 'secundario')}
          >
            Minhas reservas
          </Link>
        </nav>
      ) : null}
      <p className="text-ink-muted">
        {minhas
          ? 'Minhas reservas, por vencimento mais próximo.'
          : 'Reservas de todos os vendedores, por vencimento mais próximo.'}
      </p>
      <FilterBar>
        <UrlSelectFilter
          name="status"
          label="Status"
          options={Object.entries(STATUS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <UrlSelectFilter
          name="loteamentoId"
          label="Loteamento"
          options={(loteamentos.data?.data ?? []).map(({ id, nome }) => ({
            value: id,
            label: nome,
          }))}
        />
      </FilterBar>
      <PeriodoVendedor
        key={`${search.vencimentoDe}-${search.vencimentoAte}-${search.vendedorId}-${minhas}`}
        search={search}
        todas={!minhas}
      />
      {intervaloInvalido ? (
        <Alert>
          O vencimento final deve ser igual ou posterior ao inicial. Ajuste o
          período para consultar.
        </Alert>
      ) : (
        <DataTable
          label={minhas ? 'Minhas reservas' : 'Reservas'}
          query={query}
          columns={colunas}
          getRowKey={({ id }) => id}
          emptyTitle="Nenhuma reserva encontrada"
          emptyDescription="Reserve um lote disponível para começar."
        />
      )}
    </>
  );
}
