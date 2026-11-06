'use client';

import { podeExecutar, type Acao, type OpcoesPermissao } from './permissoes';
import { useUsuarioAtual } from './use-usuario-atual';

/**
 * Adapta a tela ao perfil: `const pode = usePermissao(); pode('marcarVendido')`.
 * Sem o usuário carregado, responde que não pode. Não protege dados: isso é da API.
 */
export function usePermissao() {
  const { data: usuario } = useUsuarioAtual();

  return (acao: Acao, opcoes?: OpcoesPermissao) =>
    usuario ? podeExecutar(usuario, acao, opcoes) : false;
}
