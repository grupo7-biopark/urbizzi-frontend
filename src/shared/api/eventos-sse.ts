/** Evento que encerra a assinatura: o servidor já explicou o motivo e não adianta reconectar. */
export const EVENTO_CONEXAO_ENCERRADA = 'conexao-encerrada';

export type MotivoEncerramento = 'SESSAO_ENCERRADA' | 'FLUXO_INDISPONIVEL';

export type EventoStatusLote<Status extends string> = {
  loteId: string;
  status: Status;
};

/** O evento traz só ids e status; qualquer outra coisa é descartada. */
export function lerStatusLote<Status extends string>(
  dados: unknown,
  statusValidos: readonly Status[],
): EventoStatusLote<Status> | null {
  if (typeof dados !== 'object' || dados === null) {
    return null;
  }

  const { loteId, status } = dados as { loteId?: unknown; status?: unknown };

  if (typeof loteId !== 'string' || !statusValidos.includes(status as Status)) {
    return null;
  }

  return { loteId, status: status as Status };
}
