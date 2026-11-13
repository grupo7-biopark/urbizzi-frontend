import { queryOptions } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { PainelSearch } from '../schemas/painel-search.schema';

type Filtros = Omit<PainelSearch, 'agrupamento'>;

export const painelKeys = { all: ['painel'] as const };

export function resumoOptions(query: Filtros) {
  return queryOptions({
    queryKey: [...painelKeys.all, 'resumo', query],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/v1/painel/resumo', { params: { query }, signal })),
  });
}

export function vendasOptions(query: PainelSearch) {
  return queryOptions({
    queryKey: [...painelKeys.all, 'vendas', query],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/v1/painel/vendas', { params: { query }, signal })),
  });
}

export function pendenciasOptions(query: Filtros) {
  return queryOptions({
    queryKey: [...painelKeys.all, 'pendencias', query],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/v1/painel/pendencias', { params: { query }, signal })),
    refetchInterval: 30_000,
  });
}

const LIMITE_LISTA = 5;

function dentroDoPeriodo(instante: string, { dataDe, dataAte }: Filtros) {
  const dia = new Date(instante).toISOString().slice(0, 10);
  return (!dataDe || dia >= dataDe) && (!dataAte || dia <= dataAte);
}

export function itensPendentesOptions(filtros: Filtros, minhas: boolean) {
  return queryOptions({
    queryKey: [...painelKeys.all, 'itens', filtros, minhas],
    queryFn: async ({ signal }) => {
      const hoje = new Date();
      const limite = new Date(hoje.getTime() + 3 * 86_400_000);
      const rota = minhas ? '/v1/reservas/minhas' : '/v1/reservas';
      const reservas = [];
      const propostas = [];
      for (let page = 1; ; page++) {
        const dados = await unwrap(
          api.GET(rota, {
            params: {
              query: {
                page,
                pageSize: 100,
                status: ['ATIVA'],
                loteamentoId: filtros.loteamentoId,
              },
            },
            signal,
          }),
        );
        for (const item of dados.data) {
          const vencimento = new Date(item.dataVencimento);
          if (
            vencimento >= hoje &&
            vencimento <= limite &&
            dentroDoPeriodo(item.dataInicio, filtros) &&
            reservas.length < LIMITE_LISTA
          )
            reservas.push(item);
          if (
            item.propostaAtual?.status === 'EM_ANALISE' &&
            propostas.length < LIMITE_LISTA
          ) {
            try {
              const proposta = await unwrap(
                api.GET('/v1/propostas/{id}', {
                  params: { path: { id: item.propostaAtual.id } },
                  signal,
                }),
              );
              if (
                proposta.status === 'EM_ANALISE' &&
                dentroDoPeriodo(proposta.dataEnvio, filtros)
              ) {
                propostas.push({ lote: item.lote, proposta });
              }
            } catch (error) {
              if (!(error instanceof ApiError && error.statusCode === 404))
                throw error;
            }
          }
        }
        if (
          page >= dados.meta.totalPages ||
          (reservas.length === LIMITE_LISTA &&
            propostas.length === LIMITE_LISTA)
        )
          break;
      }
      return {
        reservas,
        propostas: propostas.toSorted((a, b) =>
          a.proposta.prazoLimite.localeCompare(b.proposta.prazoLimite),
        ),
      };
    },
  });
}
