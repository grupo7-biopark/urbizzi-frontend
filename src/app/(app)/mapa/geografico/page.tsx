import Link from 'next/link';
import type { Metadata } from 'next';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';
import { buttonClasses } from '@/shared/ui/button';
import { MapaGeograficoView } from '@/features/mapa/components/mapa-geografico-view';
export const metadata: Metadata = { title: 'Mapa geográfico' };
export default async function MapaGeograficoPage() {
  await exigirPermissao('verMapaLotesPainel');
  return (
    <>
      <PageHeader
        title="Mapa geográfico"
        parents={[
          { label: 'Início', href: '/' },
          { label: 'Mapa', href: '/mapa' },
        ]}
        actions={
          <Link className={buttonClasses('secundario')} href="/mapa">
            Planta por imagem
          </Link>
        }
      />
      <MapaGeograficoView />
    </>
  );
}
