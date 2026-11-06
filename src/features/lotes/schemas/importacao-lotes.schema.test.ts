import { describe, expect, it } from 'vitest';
import {
  gerarRelatorioErros,
  importacaoFormSchema,
} from './importacao-lotes.schema';

function makeArquivo(tamanho = 10) {
  return new File(['x'.repeat(tamanho)], 'lotes.csv');
}

describe('importacaoFormSchema', () => {
  it('exige a planilha', () => {
    const { error } = importacaoFormSchema.safeParse({
      arquivos: [],
      criarCadastros: false,
    });

    expect(error?.issues[0]?.message).toBe('Selecione a planilha');
  });

  it('recusa acima de 5 MB, sem enviar', () => {
    const { error } = importacaoFormSchema.safeParse({
      arquivos: [makeArquivo(5 * 1024 * 1024 + 1)],
      criarCadastros: false,
    });

    expect(error?.issues[0]?.message).toBe('A planilha deve ter até 5 MB');
  });

  it('aceita até 5 MB', () => {
    expect(
      importacaoFormSchema.safeParse({
        arquivos: [makeArquivo(5 * 1024 * 1024)],
        criarCadastros: true,
      }).success,
    ).toBe(true);
  });
});

describe('gerarRelatorioErros', () => {
  it('tem uma linha por mensagem, com BOM e `;`, como o modelo', () => {
    expect(
      gerarRelatorioErros([
        {
          linha: 3,
          mensagens: ['area_m2 é obrigatório', 'Lote já cadastrado'],
        },
        { linha: 7, mensagens: ['numero é obrigatório'] },
      ]),
    ).toBe(
      '﻿linha;erro\r\n3;"area_m2 é obrigatório"\r\n3;"Lote já cadastrado"\r\n7;"numero é obrigatório"\r\n',
    );
  });

  it('escapa aspas', () => {
    expect(
      gerarRelatorioErros([{ linha: 2, mensagens: ['valor "x" inválido'] }]),
    ).toContain('2;"valor ""x"" inválido"');
  });

  it('não deixa um texto da planilha virar fórmula no Excel', () => {
    expect(
      gerarRelatorioErros([{ linha: 2, mensagens: ['=SOMA(A1)'] }]),
    ).toContain(`2;"'=SOMA(A1)"`);
  });
});
