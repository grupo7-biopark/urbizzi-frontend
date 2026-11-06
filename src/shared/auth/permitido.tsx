'use client';

import type { ReactNode } from 'react';
import type { Acao } from './permissoes';
import { usePermissao } from './use-permissao';

type PermitidoProps = {
  acao: Acao;
  /** Dono do registro, nas ações permitidas só para os próprios registros. */
  donoId?: string;
  children: ReactNode;
};

/** Esconde uma ação. Não use para esconder dados: eles não devem chegar à tela. */
export function Permitido({ acao, donoId, children }: PermitidoProps) {
  const pode = usePermissao();

  return pode(acao, { donoId }) ? children : null;
}
