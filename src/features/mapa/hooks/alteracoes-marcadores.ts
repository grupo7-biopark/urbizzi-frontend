import type { PontoNormalizado } from '@/shared/ui/coordenadas-planta';

/** Marcador ainda não salvo. Sem `loteId`, falta vincular: a API exige o lote. */
export type MarcadorNovo = PontoNormalizado & {
  chave: string;
  loteId: string | null;
};

export type Alteracoes = {
  novos: MarcadorNovo[];
  /** Posição nova dos marcadores já salvos, pelo id. */
  movidos: Record<string, PontoNormalizado>;
};

export type AcaoDeAlteracao =
  | { tipo: 'criar'; novo: MarcadorNovo }
  | { tipo: 'vincular'; chave: string; loteId: string }
  | { tipo: 'mover'; chave: string; ponto: PontoNormalizado }
  /** Tira as alterações de um marcador: o novo some, e o salvo volta ao lugar. */
  | { tipo: 'descartar'; chave: string }
  | { tipo: 'novosSalvos' }
  | { tipo: 'movidoSalvo'; id: string }
  | { tipo: 'descartarTudo' };

export const SEM_ALTERACOES: Alteracoes = { novos: [], movidos: {} };

function semMovido(movidos: Alteracoes['movidos'], id: string) {
  return Object.fromEntries(
    Object.entries(movidos).filter(([chave]) => chave !== id),
  );
}

export function alteracoesReducer(
  estado: Alteracoes,
  acao: AcaoDeAlteracao,
): Alteracoes {
  switch (acao.tipo) {
    case 'criar':
      return { ...estado, novos: [...estado.novos, acao.novo] };
    case 'vincular':
      return {
        ...estado,
        novos: estado.novos.map((novo) =>
          novo.chave === acao.chave ? { ...novo, loteId: acao.loteId } : novo,
        ),
      };
    case 'mover':
      return estado.novos.some(({ chave }) => chave === acao.chave)
        ? {
            ...estado,
            novos: estado.novos.map((novo) =>
              novo.chave === acao.chave ? { ...novo, ...acao.ponto } : novo,
            ),
          }
        : {
            ...estado,
            movidos: { ...estado.movidos, [acao.chave]: acao.ponto },
          };
    case 'descartar':
      return {
        novos: estado.novos.filter(({ chave }) => chave !== acao.chave),
        movidos: semMovido(estado.movidos, acao.chave),
      };
    case 'novosSalvos':
      return { ...estado, novos: [] };
    case 'movidoSalvo':
      return { ...estado, movidos: semMovido(estado.movidos, acao.id) };
    case 'descartarTudo':
      return SEM_ALTERACOES;
  }
}

export function contarAlteracoes({ novos, movidos }: Alteracoes) {
  return novos.length + Object.keys(movidos).length;
}

export function temMarcadorSemLote({ novos }: Alteracoes) {
  return novos.some(({ loteId }) => loteId === null);
}

/** Os lotes que já têm lugar na planta, mesmo antes de salvar. */
export function getLotesPosicionados({ novos }: Alteracoes) {
  return new Set(novos.flatMap(({ loteId }) => (loteId ? [loteId] : [])));
}
