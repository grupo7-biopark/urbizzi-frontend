import { z } from 'zod';
import type { ErroImportacao } from '../api/lotes.api';

const TAMANHO_MAXIMO = 5 * 1024 * 1024;

// O formato é conferido pela API, que também lê o conteúdo: aqui, só o que evita o envio.
export const importacaoFormSchema = z.object({
  arquivos: z
    .array(z.custom<File>())
    .min(1, 'Selecione a planilha')
    .refine(
      (arquivos) => arquivos.every(({ size }) => size <= TAMANHO_MAXIMO),
      'A planilha deve ter até 5 MB',
    ),
  criarCadastros: z.boolean(),
});

export type ImportacaoFormValues = z.infer<typeof importacaoFormSchema>;

function celulaCsv(valor: string) {
  // Uma célula iniciada por estes sinais vira fórmula ao abrir no Excel.
  const seguro = /^[=+\-@]/.test(valor) ? `'${valor}` : valor;

  return `"${seguro.replaceAll('"', '""')}"`;
}

/** Mesmo formato do modelo da API: `;` e BOM, como o Excel em português espera. */
export function gerarRelatorioErros(erros: ErroImportacao[]) {
  const linhas = erros.flatMap(({ linha, mensagens }) =>
    mensagens.map((mensagem) => `${linha};${celulaCsv(mensagem)}`),
  );

  return `﻿linha;erro\r\n${linhas.join('\r\n')}\r\n`;
}
