import { describe, expect, it } from 'vitest';
import {
  analisarGrade,
  lerNomeFatia,
  MAXIMO_ARQUIVOS,
  TAMANHO_MAXIMO_ARQUIVO,
} from './grade-fatias';

function arquivos(...nomes: string[]) {
  return nomes.map((name) => ({ name, size: 1024 }));
}

describe('lerNomeFatia', () => {
  it.each([
    ['fatia_01_02.png', { linha: 1, coluna: 2 }],
    ['fatia_10_03.jpeg', { linha: 10, coluna: 3 }],
    ['FATIA_01_01.PNG', { linha: 1, coluna: 1 }],
  ])('lê a posição de %s', (nome, posicao) => {
    expect(lerNomeFatia(nome)).toEqual(posicao);
  });

  it.each([
    'planta.png',
    'fatia_1_2.png',
    'fatia_01_02',
    'fatia_00_01.png',
    'fatia_01_00.png',
    'copia_fatia_01_01.png',
  ])('recusa %s', (nome) => {
    expect(lerNomeFatia(nome)).toBeNull();
  });
});

describe('analisarGrade', () => {
  it('sem arquivos, não há grade nem problema', () => {
    expect(analisarGrade([])).toEqual({
      imagemUnica: false,
      linhas: 0,
      colunas: 0,
      celulas: [],
      problemas: [],
    });
  });

  it('um arquivo com qualquer nome é uma imagem única', () => {
    expect(analisarGrade(arquivos('masterplan.png'))).toEqual({
      imagemUnica: true,
      linhas: 1,
      colunas: 1,
      celulas: [],
      problemas: [],
    });
  });

  it('monta a grade completa, em qualquer ordem de seleção', () => {
    const analise = analisarGrade(
      arquivos(
        'fatia_02_02.png',
        'fatia_01_01.png',
        'fatia_02_01.png',
        'fatia_01_02.png',
      ),
    );

    expect(analise.imagemUnica).toBe(false);
    expect(analise.linhas).toBe(2);
    expect(analise.colunas).toBe(2);
    expect(analise.problemas).toEqual([]);
    expect(analise.celulas.map(({ nome }) => nome)).toEqual([
      'fatia_01_01',
      'fatia_01_02',
      'fatia_02_01',
      'fatia_02_02',
    ]);
    expect(analise.celulas.every(({ presente }) => presente)).toBe(true);
  });

  it('aponta as fatias que faltam', () => {
    const analise = analisarGrade(
      arquivos('fatia_01_01.png', 'fatia_01_02.png', 'fatia_02_01.png'),
    );

    expect(analise.problemas).toEqual([
      'A grade 2 x 2 está incompleta. Faltam: fatia_02_02.',
    ]);
    expect(
      analise.celulas.filter(({ presente }) => !presente).map((c) => c.nome),
    ).toEqual(['fatia_02_02']);
  });

  it('uma fatia sozinha fora da primeira posição também pede a grade inteira', () => {
    expect(analisarGrade(arquivos('fatia_01_02.png')).problemas).toEqual([
      'A grade 1 x 2 está incompleta. Faltam: fatia_01_01.',
    ]);
  });

  it('resume a lista quando faltam muitas fatias', () => {
    const { problemas } = analisarGrade(
      arquivos('fatia_01_01.png', 'fatia_03_03.png'),
    );

    expect(problemas).toEqual([
      'A grade 3 x 3 está incompleta. Faltam: fatia_01_02, fatia_01_03, fatia_02_01, fatia_02_02, fatia_02_03 e mais 2.',
    ]);
  });

  it('com vários arquivos, recusa nome fora do padrão', () => {
    const { problemas } = analisarGrade(
      arquivos('fatia_01_01.png', 'masterplan.png'),
    );

    expect(problemas).toEqual([
      'Ao enviar mais de um arquivo, todos devem se chamar fatia_LL_CC (ex.: fatia_01_02.png). Fora do padrão: masterplan.png.',
    ]);
  });

  it('recusa dois arquivos na mesma posição, mesmo com extensões diferentes', () => {
    const { problemas } = analisarGrade(
      arquivos('fatia_01_01.png', 'fatia_01_01.jpg'),
    );

    expect(problemas).toEqual([
      'Há mais de um arquivo para a mesma posição: fatia_01_01.',
    ]);
  });

  it('não monta uma grade absurda por causa de um nome errado', () => {
    const analise = analisarGrade(
      arquivos('fatia_01_01.png', 'fatia_99_99.png'),
    );

    expect(analise.celulas).toEqual([]);
    expect(analise.problemas).toEqual([
      'A grade 99 x 99 passa do limite de 100 fatias. Confira os nomes dos arquivos.',
    ]);
  });

  it('aceita a grade no limite de 10 x 10', () => {
    const nomes = Array.from({ length: 100 }, (_, index) => {
      const linha = String(Math.floor(index / 10) + 1).padStart(2, '0');
      const coluna = String((index % 10) + 1).padStart(2, '0');

      return `fatia_${linha}_${coluna}.png`;
    });

    expect(analisarGrade(arquivos(...nomes)).problemas).toEqual([]);
  });

  it('recusa arquivos demais', () => {
    const nomes = Array.from(
      { length: MAXIMO_ARQUIVOS + 1 },
      (_, index) => `foto-${index}.png`,
    );

    expect(analisarGrade(arquivos(...nomes)).problemas[0]).toBe(
      'Envie até 100 arquivos.',
    );
  });

  it.each(['planta.pdf', 'planta.webp', 'planta'])(
    'recusa o formato de %s',
    (nome) => {
      expect(analisarGrade(arquivos(nome)).problemas).toEqual([
        `Só PNG e JPEG são aceitos: ${nome}.`,
      ]);
    },
  );

  it.each(['planta.png', 'planta.JPG', 'planta.jpeg'])('aceita %s', (nome) => {
    expect(analisarGrade(arquivos(nome)).problemas).toEqual([]);
  });

  it('recusa arquivo acima de 300 MB e aceita no limite', () => {
    expect(
      analisarGrade([{ name: 'planta.png', size: TAMANHO_MAXIMO_ARQUIVO + 1 }])
        .problemas,
    ).toEqual(['Cada arquivo pode ter até 300 MB: planta.png.']);
    expect(
      analisarGrade([{ name: 'planta.png', size: TAMANHO_MAXIMO_ARQUIVO }])
        .problemas,
    ).toEqual([]);
  });
});
