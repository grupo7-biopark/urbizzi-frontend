'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Permitido } from '@/shared/auth/permitido';
import { buttonClasses } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageHeader, type BreadcrumbItem } from '@/shared/ui/page-header';
import { loteamentoDetailOptions } from '../api/loteamentos.queries';
import { EditarLoteamentoForm } from './loteamento-form';
import { LoteamentoQueryState } from './loteamento-query-state';
import { RemoverLoteamento } from './remover-loteamento';

const PARENTS: BreadcrumbItem[] = [
  { label: 'Início', href: '/' },
  { label: 'Loteamentos', href: '/loteamentos' },
];

function Dado({ termo, valor }: { termo: string; valor: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-small font-bold">{termo}</dt>
      <dd className="wrap-anywhere whitespace-pre-line">
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
      <dl className="flex flex-col gap-4">
        <Dado termo="Descrição" valor={loteamento.descricao} />
        <Dado termo="Localização" valor={loteamento.localizacao} />
      </dl>
      <section aria-labelledby="quadras-titulo" className="flex flex-col gap-4">
        <h2 id="quadras-titulo" className="font-display text-section-label">
          Quadras
        </h2>
        <EmptyState
          title="Quadras em construção"
          description="O cadastro de quadras deste loteamento ainda não está disponível."
        />
      </section>
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
