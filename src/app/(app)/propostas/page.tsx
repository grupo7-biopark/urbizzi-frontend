import type { Metadata } from 'next';
import { MinhasPropostasTable } from '@/features/propostas/components/minhas-propostas-table';
import { propostasSearchSchema } from '@/features/propostas/schemas/propostas-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Minhas propostas' };

export default async function PropostasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissao('acompanharPropostas');

  const search = propostasSearchSchema.parse(await searchParams);
  return (
    <>
      <PageHeader
        title="Minhas propostas"
        parents={[{ label: 'Início', href: '/' }]}
        description="Acompanhe o prazo de análise e o motivo das decisões nas suas propostas."
      />
      <MinhasPropostasTable search={search} />
    </>
  );
}
