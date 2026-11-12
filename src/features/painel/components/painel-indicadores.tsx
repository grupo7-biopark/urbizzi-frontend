'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { getErrorMessage } from '@/shared/api/errors';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { formatDataHora } from '@/shared/ui/datas';
import { ErrorState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { formatMoeda } from '@/shared/ui/masks';
import { Panel } from '@/shared/ui/panel';
import { Select } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { useListParams } from '@/shared/ui/use-list-params';
import {
  itensPendentesOptions,
  pendenciasOptions,
  resumoOptions,
  vendasOptions,
} from '../api/painel.queries';
import {
  periodoInvalido,
  type PainelSearch,
} from '../schemas/painel-search.schema';

const CONTAGENS = [
  ['total', 'Total de lotes', 'neutro'],
  ['disponivel', 'Disponíveis', 'disponivel'],
  ['reservado', 'Reservados', 'reservado'],
  ['vendido', 'Vendidos', 'vendido'],
  ['bloqueado', 'Bloqueados', 'bloqueado'],
] as const;

function Falha({ erro, repetir }: { erro: unknown; repetir: () => void }) {
  return (
    <ErrorState
      message={getErrorMessage(erro)}
      action={
        <Button variant="secundario" onClick={repetir}>
          Tentar novamente
        </Button>
      }
    />
  );
}

function Grafico({
  legenda,
  itens,
}: {
  legenda: string;
  itens: { id: string; nome: string; quantidade: number; valorTotal: string }[];
}) {
  if (!itens.length)
    return <p className="text-ink-muted">Nenhuma venda no período.</p>;
  const maximo = itens.reduce((max, item) => Math.max(max, item.quantidade), 1);
  return (
    <ul aria-label={legenda} className="grid gap-3">
      {itens.map(({ id, nome, quantidade, valorTotal }) => (
        <li key={id} className="grid gap-1">
          <div className="flex flex-wrap justify-between gap-x-3 text-small">
            <span className="min-w-0 wrap-anywhere">{nome}</span>
            <span>
              {quantidade} · {formatMoeda(valorTotal)}
            </span>
          </div>
          <div aria-hidden="true" className="h-2 bg-surface-alt">
            <div
              className="h-full bg-status-vendido"
              style={{ width: `${(quantidade / maximo) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PainelIndicadores({
  search,
  podeListar,
  minhas,
}: {
  search: PainelSearch;
  podeListar: boolean;
  minhas: boolean;
}) {
  const { setParams } = useListParams();
  const { agrupamento, ...filtros } = search;
  const valido = !periodoInvalido(search);
  const opcoes = useQuery(resumoOptions({}));
  const resumo = useQuery({ ...resumoOptions(filtros), enabled: valido });
  const vendas = useQuery({ ...vendasOptions(search), enabled: valido });
  const pendencias = useQuery({
    ...pendenciasOptions(filtros),
    enabled: valido,
  });
  const itens = useQuery({
    ...itensPendentesOptions(filtros, minhas),
    enabled: valido && podeListar,
  });

  function aplicar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    setParams(Object.fromEntries(dados));
  }

  return (
    <div className="grid min-w-0 gap-6">
      <Panel title="Filtros do painel">
        <form
          key={JSON.stringify(search)}
          onSubmit={aplicar}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <Select
            label="Loteamento"
            name="loteamentoId"
            defaultValue={search.loteamentoId ?? ''}
          >
            <option value="">Todos</option>
            {opcoes.data?.porLoteamento.map(({ id, nome }) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            label="Data inicial"
            name="dataDe"
            defaultValue={search.dataDe}
          />
          <Input
            type="date"
            label="Data final"
            name="dataAte"
            defaultValue={search.dataAte}
          />
          <Select
            label="Agrupar vendas por"
            name="agrupamento"
            defaultValue={agrupamento}
          >
            <option value="dia">Dia</option>
            <option value="semana">Semana</option>
            <option value="mes">Mês</option>
          </Select>
          <Button type="submit">Aplicar filtros</Button>
        </form>
        {opcoes.isError ? (
          <Falha erro={opcoes.error} repetir={() => void opcoes.refetch()} />
        ) : null}
        {!valido ? (
          <p role="alert" className="mt-3 text-danger">
            A data inicial deve ser anterior ou igual à data final.
          </p>
        ) : null}
      </Panel>
      {valido ? (
        <>
          <Panel title="Resumo de lotes">
            {resumo.isPending ? (
              <Skeleton
                aria-label="Carregando resumo de lotes"
                className="h-24"
              />
            ) : resumo.isError ? (
              <Falha
                erro={resumo.error}
                repetir={() => void resumo.refetch()}
              />
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  {CONTAGENS.map(([chave, rotulo, tom]) => (
                    <div key={chave} className="border border-border p-3">
                      <dt>
                        <Badge tone={tom}>{rotulo}</Badge>
                      </dt>
                      <dd className="mt-2 text-heading tabular-nums">
                        {resumo.data.geral[chave]}
                      </dd>
                    </div>
                  ))}
                </dl>
                {!search.loteamentoId &&
                resumo.data.porLoteamento.length > 0 ? (
                  <ul
                    aria-label="Totais por loteamento"
                    className="mt-4 grid gap-3"
                  >
                    {resumo.data.porLoteamento.map((item) => (
                      <li key={item.id} className="border-t border-border pt-3">
                        <Link
                          className="font-bold underline"
                          href={`/loteamentos/${item.id}`}
                        >
                          {item.nome}
                        </Link>
                        <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-small">
                          {CONTAGENS.map(([chave, rotulo]) => (
                            <div className="flex gap-1" key={chave}>
                              <dt>{rotulo}</dt>
                              <dd>{item[chave]}</dd>
                            </div>
                          ))}
                        </dl>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </Panel>
          <Panel title="Vendas">
            {vendas.isPending ? (
              <Skeleton aria-label="Carregando vendas" className="h-24" />
            ) : vendas.isError ? (
              <Falha
                erro={vendas.error}
                repetir={() => void vendas.refetch()}
              />
            ) : (
              <>
                <p className="mb-4 font-bold">
                  {vendas.data.total} vendas ·{' '}
                  {formatMoeda(vendas.data.valorTotal)}
                </p>
                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="min-w-0">
                    <h3 className="mb-3 font-bold">Por período</h3>
                    <Grafico
                      legenda="Vendas por período"
                      itens={vendas.data.porPeriodo.map((item) => ({
                        ...item,
                        nome: item.periodo,
                        id: item.periodo,
                      }))}
                    />
                  </section>
                  <section className="min-w-0">
                    <h3 className="mb-3 font-bold">Por vendedor</h3>
                    <Grafico
                      legenda="Vendas por vendedor"
                      itens={vendas.data.porVendedor.map((item) => ({
                        ...item,
                        id: item.vendedorId,
                      }))}
                    />
                  </section>
                </div>
              </>
            )}
          </Panel>
          <Panel title="Pendências">
            {pendencias.isPending ? (
              <Skeleton aria-label="Carregando pendências" className="h-16" />
            ) : pendencias.isError ? (
              <Falha
                erro={pendencias.error}
                repetir={() => void pendencias.refetch()}
              />
            ) : (
              <p className="mb-4">
                {pendencias.data.reservasVencendoEmBreve} reservas vencendo em
                breve · {pendencias.data.propostasPendentes} propostas pendentes
                · {pendencias.data.propostasAtrasadas} atrasadas
              </p>
            )}
            {podeListar ? (
              itens.isPending ? (
                <Skeleton
                  aria-label="Carregando itens pendentes"
                  className="h-20"
                />
              ) : itens.isError ? (
                <Falha
                  erro={itens.error}
                  repetir={() => void itens.refetch()}
                />
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  <section>
                    <h3 className="font-bold">Reservas vencendo em breve</h3>
                    {itens.data.reservas.length ? (
                      <ul className="mt-2 grid gap-2">
                        {itens.data.reservas.map(
                          ({ id, lote, dataVencimento }) => (
                            <li key={id}>
                              <Link
                                className="underline"
                                href={`/lotes/${lote.id}`}
                              >
                                Lote {lote.numero} · {lote.loteamento}
                              </Link>
                              <p className="text-small">
                                {formatDataHora(dataVencimento)}
                              </p>
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <p className="text-ink-muted">
                        Nenhuma reserva próxima do vencimento.
                      </p>
                    )}
                  </section>
                  <section>
                    <h3 className="font-bold">Propostas em análise</h3>
                    {itens.data.propostas.length ? (
                      <ul className="mt-2 grid gap-2">
                        {itens.data.propostas.map(({ lote, proposta }) => (
                          <li key={proposta.id}>
                            <Link
                              className="underline"
                              href={`/lotes/${lote.id}`}
                            >
                              Proposta do lote {lote.numero} · {lote.loteamento}
                            </Link>
                            <p className="flex flex-wrap gap-2 text-small">
                              {formatDataHora(proposta.prazoLimite)}
                              {proposta.atrasada ? (
                                <Badge tone="perigo">Atrasada</Badge>
                              ) : null}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-ink-muted">
                        Nenhuma proposta em análise.
                      </p>
                    )}
                  </section>
                </div>
              )
            ) : null}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
