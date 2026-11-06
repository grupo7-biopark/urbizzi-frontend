import type { Metadata } from 'next';
import { PlantaAtivaVisualizador } from '@/features/mapa/components/planta-ativa';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Mapa' };

export default async function MapaPage() {
  await exigirPermissao('verMapaLotesPainel');

  return (
    <>
      <PageHeader title="Mapa" parents={[{ label: 'Início', href: '/' }]} />
      <PlantaAtivaVisualizador />
    </>
  );
}
