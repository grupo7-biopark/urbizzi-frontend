'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge } from '@/shared/ui/badge';
import { buttonClasses } from '@/shared/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { IconEnviar } from '@/shared/ui/icon';
import type { Planta } from '../api/plantas.api';
import { plantasListOptions } from '../api/plantas.queries';
import type { PlantasSearch } from '../schemas/plantas-search.schema';
import { AtivarPlantaButton } from './ativar-planta-button';
import { StatusPlantaBadge } from './status-planta-badge';

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function getGrade({ gradeLinhas, gradeColunas }: Planta) {
  return gradeLinhas === 1 && gradeColunas === 1
    ? 'Imagem única'
    : `${gradeLinhas} x ${gradeColunas}`;
}

function Situacao({ planta }: { planta: Planta }) {
  return (
    // O status muda sozinho, com a atualização automática: precisa ser anunciado.
    <span aria-live="polite" className="inline-flex flex-col gap-1">
      <span className="inline-flex flex-wrap gap-1">
        <StatusPlantaBadge status={planta.status} />
        {planta.ativa ? <Badge tone="destaque">Ativa</Badge> : null}
      </span>
      {planta.status === 'ERRO' ? (
        // `danger` não atinge 4,5:1 sobre o hover da linha; a cor fica com o Badge.
        <span className="max-w-xs text-small text-ink-muted">
          {planta.mensagemErro ?? 'Não foi possível processar esta planta.'}
        </span>
      ) : null}
    </span>
  );
}

const COLUNAS: DataTableColumn<Planta>[] = [
  {
    id: 'versao',
    header: 'Versão',
    cell: ({ versao }) => <span className="tabular-nums">{versao}</span>,
  },
  {
    id: 'nome',
    header: 'Nome',
    cell: ({ nome }) => <span className="font-bold">{nome}</span>,
  },
  {
    id: 'grade',
    header: 'Grade',
    cell: (planta) => (
      <span className="whitespace-nowrap">{getGrade(planta)}</span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (planta) => <Situacao planta={planta} />,
  },
  {
    id: 'createdAt',
    header: 'Enviada em',
    cell: ({ createdAt }) => (
      <span className="whitespace-nowrap tabular-nums">
        {DATA_HORA.format(new Date(createdAt))}
      </span>
    ),
  },
  {
    id: 'acoes',
    header: 'Ações',
    acoes: true,
    cell: (planta) =>
      planta.status === 'PRONTA' && !planta.ativa ? (
        <span className="flex *:grow md:justify-end md:*:grow-0">
          <AtivarPlantaButton planta={planta} />
        </span>
      ) : null,
  },
];

export function EnviarPlantaLink() {
  return (
    <Link href="/plantas/nova" className={buttonClasses('primario')}>
      <IconEnviar className="size-4" />
      Enviar planta
    </Link>
  );
}

export function PlantasTable({ search }: { search: PlantasSearch }) {
  const query = useQuery(plantasListOptions(search));

  return (
    <DataTable
      label="Versões da planta"
      query={query}
      getRowKey={({ id }) => id}
      emptyTitle="Nenhuma planta enviada"
      emptyDescription="Envie a primeira versão para exibi-la no mapa."
      emptyAction={<EnviarPlantaLink />}
      columns={COLUNAS}
    />
  );
}
