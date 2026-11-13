'use client';

import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { formatDataHora } from '@/shared/ui/datas';
import { formatMoeda } from '@/shared/ui/masks';
import type { Proposta } from '../api/propostas.api';
import { pendentesOptions } from '../api/propostas.queries';
import type { PropostasSearch } from '../schemas/propostas-search.schema';
import { AnalisarProposta } from './analisar-proposta';

function criarColunas(
  abrir: (id: string) => void,
): DataTableColumn<Proposta>[] {
  return [
    {
      id: 'valor',
      header: 'Valor proposto',
      cell: ({ valor }) => (
        <span className="font-bold tabular-nums">{formatMoeda(valor)}</span>
      ),
    },
    {
      id: 'condicoes',
      header: 'Condições',
      cell: ({ condicoes }) => (
        <p className="max-w-prose whitespace-pre-line wrap-anywhere">
          {condicoes}
        </p>
      ),
    },
    {
      id: 'envio',
      header: 'Enviada em',
      cell: ({ dataEnvio }) => (
        <time dateTime={dataEnvio}>{formatDataHora(dataEnvio)}</time>
      ),
    },
    {
      id: 'prazo',
      header: 'Prazo de análise',
      cell: ({ prazoLimite, atrasada }) => (
        <div className="flex flex-col items-start gap-2">
          <time dateTime={prazoLimite}>{formatDataHora(prazoLimite)}</time>
          <Badge tone={atrasada ? 'perigo' : 'neutro'}>
            {atrasada ? 'Em atraso' : 'No prazo'}
          </Badge>
        </div>
      ),
    },
    {
      id: 'acoes',
      header: 'Ações',
      acoes: true,
      cell: ({ id }) => (
        <Button variant="fantasma" size="compacto" onClick={() => abrir(id)}>
          Analisar proposta
        </Button>
      ),
    },
  ];
}

export function PendenciasTable({
  search,
  invalidates = [],
}: {
  search: PropostasSearch;
  invalidates?: QueryKey[];
}) {
  const query = useQuery(pendentesOptions(search));
  const [selecionada, setSelecionada] = useState<string>();
  const lista = useRef<HTMLElement>(null);
  function fechar() {
    setSelecionada(undefined);
    requestAnimationFrame(() => lista.current?.focus());
  }
  const colunas = criarColunas(setSelecionada);
  return (
    <>
      <p className="text-ink-muted">
        As propostas com prazo mais antigo aparecem primeiro. Aprovar uma
        proposta mantém o lote reservado.
      </p>
      <section ref={lista} tabIndex={-1} aria-label="Lista de pendências">
        <DataTable
          label="Propostas pendentes"
          query={query}
          columns={colunas}
          getRowKey={({ id }) => id}
          emptyTitle="Nenhuma proposta pendente"
          emptyDescription="As propostas enviadas para análise aparecerão aqui."
        />
      </section>
      {selecionada ? (
        <AnalisarProposta
          key={selecionada}
          id={selecionada}
          onClose={fechar}
          invalidates={invalidates}
        />
      ) : null}
    </>
  );
}
