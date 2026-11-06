import type { Metadata } from 'next';
import {
  EnviarPlantaLink,
  PlantasTable,
} from '@/features/plantas/components/plantas-table';
import { plantasSearchSchema } from '@/features/plantas/schemas/plantas-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Plantas' };

export default async function PlantasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissao('gerenciarPlanta');
  const search = plantasSearchSchema.parse(await searchParams);

  return (
    <>
      <PageHeader
        title="Plantas"
        parents={[{ label: 'Início', href: '/' }]}
        actions={<EnviarPlantaLink />}
      />
      <PlantasTable search={search} />
    </>
  );
}
