import type { Metadata } from 'next';
import { MapaInterno } from '@/features/mapa/components/mapa-interno';
import { mapaSearchSchema } from '@/features/mapa/schemas/mapa-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Mapa' };

export default async function MapaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissao('verMapaLotesPainel');
  const search = mapaSearchSchema.parse(await searchParams);

  return (
    <>
      <PageHeader title="Mapa" parents={[{ label: 'Início', href: '/' }]} />
      <MapaInterno search={search} />
    </>
  );
}
