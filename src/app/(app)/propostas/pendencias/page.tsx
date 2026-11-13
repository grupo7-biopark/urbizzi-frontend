import type { Metadata } from 'next';
import { PendenciasTable } from '@/features/propostas/components/pendencias-table';
import { propostasSearchSchema } from '@/features/propostas/schemas/propostas-search.schema';
import { lotesKeys } from '@/features/lotes/api/lotes.queries';
import { clientesKeys } from '@/features/clientes/api/clientes.queries';
import { mapaKeys } from '@/features/mapa/api/mapa.queries';
import { PageHeader } from '@/shared/ui/page-header';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Pendências' };

export default async function PendenciasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissao('analisarPropostas');

  return (
    <>
      <PageHeader
        title="Pendências"
        parents={[
          { label: 'Início', href: '/' },
          { label: 'Propostas', href: '/propostas' },
        ]}
      />
      <PendenciasTable
        search={propostasSearchSchema.parse(await searchParams)}
        invalidates={[lotesKeys.all, clientesKeys.historicos(), mapaKeys.all]}
      />
    </>
  );
}
