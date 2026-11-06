import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';
import { uploadFormData } from '@/shared/api/upload';

export type Lote = components['schemas']['LoteDto'];
export type StatusLote = components['schemas']['StatusLote'];
export type CreateLote = components['schemas']['CreateLoteDto'];
export type UpdateLote = components['schemas']['UpdateLoteDto'];
export type ListLotesQuery = NonNullable<
  paths['/v1/lotes']['get']['parameters']['query']
>;

export type ResultadoImportacao =
  components['schemas']['ResultadoImportacaoDto'];
export type ErroImportacao = components['schemas']['ErroImportacaoDto'];
export type EnvioImportacao = {
  arquivo: File;
  criarCadastros: boolean;
};

/** O máximo que a API aceita por página: cobre as opções dos filtros e do formulário. */
const OPCOES_POR_PAGINA = 100;

export function listLotes(query: ListLotesQuery) {
  return unwrap(api.GET('/v1/lotes', { params: { query } }));
}

export function getLote(id: string) {
  return unwrap(api.GET('/v1/lotes/{id}', { params: { path: { id } } }));
}

export function createLote(body: CreateLote) {
  return unwrap(api.POST('/v1/lotes', { body }));
}

export function updateLote(id: string, body: UpdateLote) {
  return unwrap(
    api.PATCH('/v1/lotes/{id}', { params: { path: { id } }, body }),
  );
}

export function deleteLote(id: string) {
  return unwrap(api.DELETE('/v1/lotes/{id}', { params: { path: { id } } }));
}

/** Sem `confirmar`, a API só valida. Com ele, grava tudo ou nada. */
export function importarLotes(
  { arquivo, criarCadastros }: EnvioImportacao,
  confirmar: boolean,
) {
  const body = new FormData();

  body.append('arquivo', arquivo);
  body.append('criarCadastros', String(criarCadastros));
  body.append('confirmar', String(confirmar));

  return uploadFormData<ResultadoImportacao>('/v1/lotes/importacao', body);
}

/** Link para o navegador baixar o arquivo, com a sessão, pelo proxy. */
export function getModeloImportacaoHref(formato: 'xlsx' | 'csv') {
  return `/api/backend/v1/lotes/importacao/modelo?formato=${formato}`;
}

// O `LoteDto` traz só os ids: os nomes vêm destas rotas.
export function getLoteamentoDoLote(id: string) {
  return unwrap(api.GET('/v1/loteamentos/{id}', { params: { path: { id } } }));
}

export function getQuadraDoLote(id: string) {
  return unwrap(api.GET('/v1/quadras/{id}', { params: { path: { id } } }));
}

export function listLoteamentosOpcoes() {
  return unwrap(
    api.GET('/v1/loteamentos', {
      params: { query: { page: 1, pageSize: OPCOES_POR_PAGINA } },
    }),
  );
}

export function listQuadrasOpcoes(loteamentoId: string) {
  return unwrap(
    api.GET('/v1/loteamentos/{loteamentoId}/quadras', {
      params: {
        path: { loteamentoId },
        query: { page: 1, pageSize: OPCOES_POR_PAGINA },
      },
    }),
  );
}
