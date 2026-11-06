'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Permitido } from '@/shared/auth/permitido';
import { buttonClasses } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { IconEditar } from '@/shared/ui/icon';
import { PageHeader, type BreadcrumbItem } from '@/shared/ui/page-header';
import { Panel } from '@/shared/ui/panel';
import { loteamentoDetailOptions } from '../api/loteamentos.queries';
import { EditarLoteamentoForm } from './loteamento-form';
import { LoteamentoQueryState } from './loteamento-query-state';
import { QuadrasPanel } from './quadras-panel';
import { RemoverLoteamento } from './remover-loteamento';

const PARENTS: BreadcrumbItem[] = [
  { label: 'Início', href: '/' },
  { label: 'Loteamentos', href: '/loteamentos' },
];

function Dado({ termo, valor }: { termo: string; valor: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-ink-muted">{termo}</dt>
      <dd
        className={cn(
          'wrap-anywhere whitespace-pre-line',
          valor === null && 'text-ink-muted',
        )}
      >
        {valor ?? 'Não informada'}
      </dd>
    </div>
  );
}

export function LoteamentoDetalhe({ id }: { id: string }) {
  const query = useQuery(loteamentoDetailOptions(id));
  const router = useRouter();

  if (!query.isSuccess) {
    return (
      <>
        <PageHeader title="Loteamento" parents={PARENTS} />
        <LoteamentoQueryState query={query} />
      </>
    );
  }

  const loteamento = query.data;

  return (
    <>
      <PageHeader
        title={loteamento.nome}
        parents={PARENTS}
        actions={
          <Permitido acao="gerenciarCadastros">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/loteamentos/${id}/editar`}
                className={buttonClasses('secundario')}
              >
                <IconEditar className="size-4" />
                Editar
              </Link>
              {/* Tira o detalhe do histórico: "voltar" não leva a um registro removido. */}
              <RemoverLoteamento
                loteamento={loteamento}
                onRemoved={() => router.replace('/loteamentos')}
              />
            </div>
          </Permitido>
        }
      />
      <Panel title="Dados">
        <dl className="grid gap-5 md:grid-cols-2">
          <Dado termo="Descrição" valor={loteamento.descricao} />
          <Dado termo="Localização" valor={loteamento.localizacao} />
        </dl>
      </Panel>
      <QuadrasPanel loteamentoId={id} />
    </>
  );
}

export function EditarLoteamento({ id }: { id: string }) {
  const query = useQuery(loteamentoDetailOptions(id));
  const parents = query.data
    ? [...PARENTS, { label: query.data.nome, href: `/loteamentos/${id}` }]
    : PARENTS;

  return (
    <>
      <PageHeader title="Editar loteamento" parents={parents} />
      {query.isSuccess ? (
        <EditarLoteamentoForm loteamento={query.data} />
      ) : (
        <LoteamentoQueryState query={query} />
      )}
    </>
  );
}
