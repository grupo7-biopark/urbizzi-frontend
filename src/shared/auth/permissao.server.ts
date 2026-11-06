import 'server-only';
import { forbidden } from 'next/navigation';
import { ApiError } from '@/shared/api/errors';
import { podeExecutar, type Acao, type OpcoesPermissao } from './permissoes';
import { getUsuarioAtual } from './usuario-atual.server';

/**
 * Primeira linha de toda página de `(app)`. Fica na página, e não no layout, porque
 * o layout não roda de novo ao navegar entre telas. Sem permissão, interrompe a
 * renderização e mostra `(app)/forbidden.tsx`, com status 403.
 */
export async function exigirPermissao(acao: Acao, opcoes?: OpcoesPermissao) {
  const usuario = await getUsuarioAtual();

  if (!podeExecutar(usuario, acao, opcoes)) {
    forbidden();
  }

  return usuario;
}

/**
 * Para buscas de Server Components: um 403 da API vira a tela 403. Em produção, o
 * `error.tsx` não recebe os dados do erro do servidor e não saberia a causa.
 */
export async function tratarAcessoNegado<T>(busca: Promise<T>) {
  try {
    return await busca;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 403) {
      forbidden();
    }
    throw error;
  }
}
