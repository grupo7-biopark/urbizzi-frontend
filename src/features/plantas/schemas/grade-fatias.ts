// Os limites e o padrão de nome repetem os do backend, para avisar antes de enviar
// dezenas de MB. Quem decide é a API, que também lê o formato e as dimensões do
// conteúdo de cada arquivo: isso a tela não confere.
const NOME_FATIA = /^fatia_(\d{2})_(\d{2})\.[a-z0-9]+$/i;
const FORMATO_ACEITO = /\.(png|jpe?g)$/i;
const MB = 1024 * 1024;

export const TAMANHO_MAXIMO_ARQUIVO = 300 * MB;
export const MAXIMO_ARQUIVOS = 100;

const NOMES_NA_MENSAGEM = 5;

type Arquivo = Pick<File, 'name' | 'size'>;

export type CelulaGrade = {
  linha: number;
  coluna: number;
  /** Sem a extensão: `fatia_01_02`. */
  nome: string;
  presente: boolean;
};

export type AnaliseGrade = {
  imagemUnica: boolean;
  linhas: number;
  colunas: number;
  /** Linha a linha. Fica vazio na imagem única e em grade grande demais para exibir. */
  celulas: CelulaGrade[];
  /** O que impede o envio, em texto de tela. */
  problemas: string[];
};

export function lerNomeFatia(nome: string) {
  const match = NOME_FATIA.exec(nome);

  if (!match) {
    return null;
  }

  const linha = Number(match[1]);
  const coluna = Number(match[2]);

  return linha >= 1 && coluna >= 1 ? { linha, coluna } : null;
}

function doisDigitos(valor: number) {
  return String(valor).padStart(2, '0');
}

function getNomeCelula(linha: number, coluna: number) {
  return `fatia_${doisDigitos(linha)}_${doisDigitos(coluna)}`;
}

/** Limita a lista: uma grade de 10 x 10 pode ter 99 fatias faltando. */
function listarNomes(nomes: string[]) {
  const visiveis = nomes.slice(0, NOMES_NA_MENSAGEM).join(', ');
  const restantes = nomes.length - NOMES_NA_MENSAGEM;

  return restantes > 0 ? `${visiveis} e mais ${restantes}` : visiveis;
}

function getProblemasDosArquivos(arquivos: Arquivo[]) {
  const problemas: string[] = [];
  const formatoInvalido = arquivos.filter(
    ({ name }) => !FORMATO_ACEITO.test(name),
  );
  const muitoGrandes = arquivos.filter(
    ({ size }) => size > TAMANHO_MAXIMO_ARQUIVO,
  );

  if (arquivos.length > MAXIMO_ARQUIVOS) {
    problemas.push(`Envie até ${MAXIMO_ARQUIVOS} arquivos.`);
  }
  if (formatoInvalido.length > 0) {
    problemas.push(
      `Só PNG e JPEG são aceitos: ${listarNomes(formatoInvalido.map(({ name }) => name))}.`,
    );
  }
  if (muitoGrandes.length > 0) {
    problemas.push(
      `Cada arquivo pode ter até 300 MB: ${listarNomes(muitoGrandes.map(({ name }) => name))}.`,
    );
  }

  return problemas;
}

/**
 * Um arquivo fora do padrão de nome é uma imagem única. Com dois ou mais, todos
 * seguem `fatia_LL_CC`, e a grade tem tantas linhas e colunas quanto os maiores
 * números enviados: por isso uma fatia solta como `fatia_02_02` já pede a grade 2 x 2.
 */
export function analisarGrade(arquivos: Arquivo[]): AnaliseGrade {
  const problemas = getProblemasDosArquivos(arquivos);

  if (arquivos.length === 0) {
    return {
      imagemUnica: false,
      linhas: 0,
      colunas: 0,
      celulas: [],
      problemas,
    };
  }

  if (arquivos.length === 1 && !lerNomeFatia(arquivos[0]?.name ?? '')) {
    return { imagemUnica: true, linhas: 1, colunas: 1, celulas: [], problemas };
  }

  const foraDoPadrao: string[] = [];
  const presentes = new Set<string>();
  const duplicadas = new Set<string>();
  let linhas = 0;
  let colunas = 0;

  for (const { name } of arquivos) {
    const posicao = lerNomeFatia(name);

    if (!posicao) {
      foraDoPadrao.push(name);
      continue;
    }

    // Pela posição, e não pelo nome: `fatia_01_01.png` e `.jpg` ocupam o mesmo lugar.
    const nome = getNomeCelula(posicao.linha, posicao.coluna);

    if (presentes.has(nome)) {
      duplicadas.add(nome);
    }
    presentes.add(nome);
    linhas = Math.max(linhas, posicao.linha);
    colunas = Math.max(colunas, posicao.coluna);
  }

  if (foraDoPadrao.length > 0) {
    problemas.push(
      `Ao enviar mais de um arquivo, todos devem se chamar fatia_LL_CC (ex.: fatia_01_02.png). Fora do padrão: ${listarNomes(foraDoPadrao)}.`,
    );
  }
  if (duplicadas.size > 0) {
    problemas.push(
      `Há mais de um arquivo para a mesma posição: ${listarNomes([...duplicadas])}.`,
    );
  }

  // Um nome com erro de digitação, como `fatia_99_99`, pediria milhares de células.
  if (linhas * colunas > MAXIMO_ARQUIVOS) {
    problemas.push(
      `A grade ${linhas} x ${colunas} passa do limite de ${MAXIMO_ARQUIVOS} fatias. Confira os nomes dos arquivos.`,
    );

    return { imagemUnica: false, linhas, colunas, celulas: [], problemas };
  }

  const celulas: CelulaGrade[] = [];

  for (let linha = 1; linha <= linhas; linha += 1) {
    for (let coluna = 1; coluna <= colunas; coluna += 1) {
      const nome = getNomeCelula(linha, coluna);

      celulas.push({ linha, coluna, nome, presente: presentes.has(nome) });
    }
  }

  const faltantes = celulas
    .filter(({ presente }) => !presente)
    .map(({ nome }) => nome);

  if (faltantes.length > 0) {
    problemas.push(
      `A grade ${linhas} x ${colunas} está incompleta. Faltam: ${listarNomes(faltantes)}.`,
    );
  }

  return { imagemUnica: false, linhas, colunas, celulas, problemas };
}
