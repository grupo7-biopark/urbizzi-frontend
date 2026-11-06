import type { Metadata } from 'next';
import { PlantaForm } from '@/features/plantas/components/planta-form';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Enviar planta' };

export default async function NovaPlantaPage() {
  await exigirPermissao('gerenciarPlanta');

  return (
    <>
      <PageHeader
        title="Enviar planta"
        parents={[
          { label: 'Início', href: '/' },
          { label: 'Plantas', href: '/plantas' },
        ]}
      />
      <PlantaForm />
    </>
  );
}
