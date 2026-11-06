import { describe, expect, it } from 'vitest';
import {
  alteracoesReducer,
  contarAlteracoes,
  getLotesPosicionados,
  SEM_ALTERACOES,
  temMarcadorSemLote,
  type AcaoDeAlteracao,
  type Alteracoes,
} from './alteracoes-marcadores';

const SEM_LOTE = { chave: 'novo-1', loteId: null, x: 0.1, y: 0.2 };
const COM_LOTE = { chave: 'novo-2', loteId: 'lote-2', x: 0.3, y: 0.4 };

function aplicar(...acoes: AcaoDeAlteracao[]): Alteracoes {
  return acoes.reduce(alteracoesReducer, SEM_ALTERACOES);
}

describe('alteracoesReducer', () => {
  it('cria um marcador pendente', () => {
    expect(aplicar({ tipo: 'criar', novo: COM_LOTE }).novos).toEqual([
      COM_LOTE,
    ]);
  });

  it('vincula o lote só ao marcador indicado', () => {
    const { novos } = aplicar(
      { tipo: 'criar', novo: SEM_LOTE },
      { tipo: 'criar', novo: COM_LOTE },
      { tipo: 'vincular', chave: 'novo-1', loteId: 'lote-1' },
    );

    expect(novos[0]?.loteId).toBe('lote-1');
    expect(novos[1]?.loteId).toBe('lote-2');
  });

  it('mover um novo muda a posição dele, sem criar uma alteração a mais', () => {
    const estado = aplicar(
      { tipo: 'criar', novo: COM_LOTE },
      { tipo: 'mover', chave: 'novo-2', ponto: { x: 0.9, y: 0.8 } },
    );

    expect(estado.novos[0]).toMatchObject({ x: 0.9, y: 0.8 });
    expect(estado.movidos).toEqual({});
    expect(contarAlteracoes(estado)).toBe(1);
  });

  it('mover um salvo guarda a posição pelo id, e a última vale', () => {
    const estado = aplicar(
      { tipo: 'mover', chave: 'salvo-1', ponto: { x: 0.1, y: 0.1 } },
      { tipo: 'mover', chave: 'salvo-1', ponto: { x: 0.5, y: 0.5 } },
    );

    expect(estado.movidos).toEqual({ 'salvo-1': { x: 0.5, y: 0.5 } });
    expect(contarAlteracoes(estado)).toBe(1);
  });

  it('descartar tira o novo e devolve o salvo ao lugar', () => {
    const estado = aplicar(
      { tipo: 'criar', novo: COM_LOTE },
      { tipo: 'mover', chave: 'salvo-1', ponto: { x: 0.1, y: 0.1 } },
      { tipo: 'descartar', chave: 'novo-2' },
      { tipo: 'descartar', chave: 'salvo-1' },
    );

    expect(estado).toEqual(SEM_ALTERACOES);
  });

  it('depois de salvar os novos, mantém o que ainda falta mover', () => {
    const estado = aplicar(
      { tipo: 'criar', novo: COM_LOTE },
      { tipo: 'mover', chave: 'salvo-1', ponto: { x: 0.1, y: 0.1 } },
      { tipo: 'novosSalvos' },
    );

    expect(estado.novos).toEqual([]);
    expect(estado.movidos).toHaveProperty('salvo-1');
  });

  it('em um salvamento parcial, só some o que foi salvo', () => {
    const estado = aplicar(
      { tipo: 'mover', chave: 'salvo-1', ponto: { x: 0.1, y: 0.1 } },
      { tipo: 'mover', chave: 'salvo-2', ponto: { x: 0.2, y: 0.2 } },
      { tipo: 'movidoSalvo', id: 'salvo-1' },
    );

    expect(Object.keys(estado.movidos)).toEqual(['salvo-2']);
  });

  it('descartar tudo volta ao início', () => {
    expect(
      aplicar({ tipo: 'criar', novo: COM_LOTE }, { tipo: 'descartarTudo' }),
    ).toEqual(SEM_ALTERACOES);
  });
});

describe('leituras das alterações', () => {
  it('sem alterações, não há o que salvar', () => {
    expect(contarAlteracoes(SEM_ALTERACOES)).toBe(0);
    expect(temMarcadorSemLote(SEM_ALTERACOES)).toBe(false);
  });

  it('avisa quando falta vincular um lote', () => {
    expect(temMarcadorSemLote(aplicar({ tipo: 'criar', novo: SEM_LOTE }))).toBe(
      true,
    );
    expect(temMarcadorSemLote(aplicar({ tipo: 'criar', novo: COM_LOTE }))).toBe(
      false,
    );
  });

  it('o lote posicionado sai da lista antes mesmo de salvar', () => {
    expect(
      getLotesPosicionados(
        aplicar(
          { tipo: 'criar', novo: SEM_LOTE },
          { tipo: 'criar', novo: COM_LOTE },
        ),
      ),
    ).toEqual(new Set(['lote-2']));
  });
});
