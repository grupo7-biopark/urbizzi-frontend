'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useController } from 'react-hook-form';
import { getErrorMessage } from '@/shared/api/errors';
import { Alert } from '@/shared/ui/alert';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Form, FormCheckbox } from '@/shared/ui/form';
import { IconEnviar, IconSucesso } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/panel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import {
  getModeloImportacaoHref,
  type EnvioImportacao,
  type ResultadoImportacao,
} from '../api/lotes.api';
import {
  useConfirmarImportacao,
  usePreviaImportacao,
} from '../hooks/use-importar-lotes';
import {
  gerarRelatorioErros,
  importacaoFormSchema,
  type ImportacaoFormValues,
} from '../schemas/importacao-lotes.schema';

/** Problemas do arquivo inteiro: a API não os associa a um campo. */
const CAMPOS_POR_CODIGO = {
  ARQUIVO_OBRIGATORIO: 'arquivos',
  ARQUIVO_MUITO_GRANDE: 'arquivos',
  IMPORTACAO_FORMATO_INVALIDO: 'arquivos',
  IMPORTACAO_ARQUIVO_INVALIDO: 'arquivos',
  IMPORTACAO_COLUNAS_AUSENTES: 'arquivos',
  IMPORTACAO_SEM_LINHAS: 'arquivos',
  IMPORTACAO_LIMITE_EXCEDIDO: 'arquivos',
} as const;

function ModeloPanel() {
  return (
    <Panel title="1. Baixe o modelo">
      <div className="flex flex-col gap-3">
        <p className="text-ink-muted">
          Colunas obrigatórias: loteamento, quadra, número e área. Valor e
          exibição do valor são opcionais.
        </p>
        <div className="flex flex-wrap gap-2 *:grow sm:*:grow-0">
          <a
            href={getModeloImportacaoHref('xlsx')}
            download
            className={buttonClasses('secundario')}
          >
            Baixar modelo XLSX
          </a>
          <a
            href={getModeloImportacaoHref('csv')}
            download
            className={buttonClasses('secundario')}
          >
            Baixar modelo CSV
          </a>
        </div>
      </div>
    </Panel>
  );
}

function ArquivoField() {
  const {
    field: { ref, name, onBlur, onChange },
    fieldState,
  } = useController({ name: 'arquivos' });

  return (
    <Input
      ref={ref}
      name={name}
      onBlur={onBlur}
      onChange={(event) => onChange(Array.from(event.target.files ?? []))}
      type="file"
      accept=".csv,.xlsx"
      label="Planilha"
      required
      hint="Arquivo CSV ou XLSX, com até 5 MB e 5000 lotes."
      error={fieldState.error?.message}
    />
  );
}

function EnvioForm({
  onValidada,
}: {
  onValidada: (envio: EnvioImportacao, previa: ResultadoImportacao) => void;
}) {
  const previa = usePreviaImportacao();

  async function handleSubmit({
    arquivos,
    criarCadastros,
  }: ImportacaoFormValues) {
    const envio = { arquivo: arquivos[0] as File, criarCadastros };

    onValidada(envio, await previa.mutateAsync(envio));
  }

  return (
    <Panel title="2. Envie a planilha">
      <Form
        schema={importacaoFormSchema}
        defaultValues={{ arquivos: [], criarCadastros: false }}
        onSubmit={handleSubmit}
        submitLabel="Validar planilha"
        fieldsByCode={CAMPOS_POR_CODIGO}
      >
        <ArquivoField />
        <FormCheckbox
          name="criarCadastros"
          label="Criar os loteamentos e as quadras que não existirem"
          hint="Sem esta opção, as linhas com loteamento ou quadra inexistente são recusadas."
        />
      </Form>
    </Panel>
  );
}

function Resumo({ previa }: { previa: ResultadoImportacao }) {
  const itens = [
    ['Linhas lidas', previa.totalLinhas],
    ['Lotes válidos', previa.lotes],
    ['Linhas com erro', previa.erros.length],
    ['Loteamentos novos', previa.loteamentosNovos],
    ['Quadras novas', previa.quadrasNovas],
  ] as const;

  return (
    <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
      {itens.map(([termo, valor]) => (
        <div key={termo} className="flex flex-col gap-1">
          <dt className="text-caption text-ink-muted">{termo}</dt>
          <dd className="text-title tabular-nums">
            {valor.toLocaleString('pt-BR')}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function baixarRelatorio(previa: ResultadoImportacao) {
  const url = URL.createObjectURL(
    new Blob([gerarRelatorioErros(previa.erros)], {
      type: 'text/csv;charset=utf-8',
    }),
  );
  const link = document.createElement('a');

  link.href = url;
  link.download = 'erros-importacao-lotes.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function TabelaErros({ previa }: { previa: ResultadoImportacao }) {
  return (
    <div className="flex flex-col gap-3">
      <Alert>
        Nada foi gravado. Corrija as linhas abaixo na planilha e envie de novo.
      </Alert>
      <Table aria-label="Erros por linha" className="border border-border">
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Linha</TableHead>
            <TableHead>Erros</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {previa.erros.map(({ linha, mensagens }) => (
            <TableRow key={linha}>
              <TableCell className="align-top font-bold">{linha}</TableCell>
              <TableCell>
                <ul className="flex flex-col gap-1 wrap-anywhere">
                  {mensagens.map((mensagem) => (
                    <li key={mensagem}>{mensagem}</li>
                  ))}
                </ul>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button
        variant="secundario"
        className="self-start"
        onClick={() => baixarRelatorio(previa)}
      >
        Baixar relatório de erros
      </Button>
    </div>
  );
}

function PreviaPanel({
  envio,
  previa,
  onConfirmada,
  onReiniciar,
}: {
  envio: EnvioImportacao;
  previa: ResultadoImportacao;
  onConfirmada: (resultado: ResultadoImportacao) => void;
  onReiniciar: () => void;
}) {
  const confirmar = useConfirmarImportacao();
  const temErros = previa.erros.length > 0;

  return (
    <Panel title="3. Confira e confirme">
      <div className="flex flex-col gap-5">
        <p className="wrap-anywhere text-ink-muted">
          Planilha: {envio.arquivo.name}
        </p>
        <Resumo previa={previa} />
        {temErros ? <TabelaErros previa={previa} /> : null}
        {confirmar.isError ? (
          <Alert>{getErrorMessage(confirmar.error)}</Alert>
        ) : null}
        <div className="flex flex-wrap gap-2 border-t border-border pt-5 *:grow sm:*:grow-0">
          <Button
            disabled={temErros}
            loading={confirmar.isPending}
            onClick={() =>
              void confirmar.mutateAsync(envio).then(onConfirmada, () => {
                // O erro aparece no alerta acima, pelo estado da mutação.
              })
            }
          >
            Confirmar importação
          </Button>
          <Button
            variant="secundario"
            disabled={confirmar.isPending}
            onClick={onReiniciar}
          >
            Enviar outra planilha
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function ConcluidaPanel({
  resultado,
  onReiniciar,
}: {
  resultado: ResultadoImportacao;
  onReiniciar: () => void;
}) {
  return (
    <Panel title="Importação concluída">
      <div className="flex flex-col gap-5">
        <output className="flex items-center gap-2 font-bold">
          <IconSucesso className="text-status-disponivel" />
          {resultado.lotes === 1
            ? '1 lote importado.'
            : `${resultado.lotes.toLocaleString('pt-BR')} lotes importados.`}
        </output>
        <Resumo previa={resultado} />
        <div className="flex flex-wrap gap-2 border-t border-border pt-5 *:grow sm:*:grow-0">
          <Link href="/lotes" className={buttonClasses('primario')}>
            Ver os lotes
          </Link>
          <Button variant="secundario" onClick={onReiniciar}>
            Importar outra planilha
          </Button>
        </div>
      </div>
    </Panel>
  );
}

type Etapa =
  | { nome: 'envio' }
  | {
      nome: 'previa';
      envio: EnvioImportacao;
      previa: ResultadoImportacao;
    }
  | { nome: 'concluida'; resultado: ResultadoImportacao };

/**
 * A prévia vale para o arquivo enviado: trocar a planilha recomeça, para a
 * confirmação nunca gravar algo diferente do que foi conferido.
 */
export function ImportacaoLotes() {
  const [etapa, setEtapa] = useState<Etapa>({ nome: 'envio' });

  function reiniciar() {
    setEtapa({ nome: 'envio' });
  }

  if (etapa.nome === 'concluida') {
    return (
      <ConcluidaPanel resultado={etapa.resultado} onReiniciar={reiniciar} />
    );
  }

  return (
    <>
      <ModeloPanel />
      {etapa.nome === 'envio' ? (
        <EnvioForm
          onValidada={(envio, previa) =>
            setEtapa({ nome: 'previa', envio, previa })
          }
        />
      ) : (
        <PreviaPanel
          envio={etapa.envio}
          previa={etapa.previa}
          onReiniciar={reiniciar}
          onConfirmada={(resultado) =>
            // Algo pode ter mudado desde a prévia: sem gravar, mostra os novos erros.
            setEtapa(
              resultado.importado
                ? { nome: 'concluida', resultado }
                : { ...etapa, previa: resultado },
            )
          }
        />
      )}
    </>
  );
}

export function ImportarLotesLink() {
  return (
    <Link href="/lotes/importar" className={buttonClasses('secundario')}>
      <IconEnviar className="size-4" />
      Importar planilha
    </Link>
  );
}
