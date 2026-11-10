import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClasses } from '@/shared/ui/button';
import { EditarMarcadoresLink } from '@/features/mapa/components/editor-marcadores';
import { MapaComAcoes } from './mapa-com-acoes';
import { mapaSearchSchema } from '@/features/mapa/schemas/mapa-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { Permitido } from '@/shared/auth/permitido';
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
      <PageHeader
        title="Mapa"
        parents={[{ label: 'Início', href: '/' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/mapa/geografico"
              className={buttonClasses('secundario')}
            >
              Mapa geográfico
            </Link>
            <Permitido acao="gerenciarPlanta">
              <EditarMarcadoresLink />
            </Permitido>
          </div>
        }
      />
      <MapaComAcoes search={search} />
    </>
  );
}
