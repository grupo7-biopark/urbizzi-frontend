import type { Metadata } from 'next';
import { AtalhosInicio } from '@/features/navegacao/components/atalhos-inicio';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Início' };

export default async function HomePage() {
  await exigirPermissao('verMapaLotesPainel');

  return (
    <>
      <PageHeader title="Início" description="Escolha por onde continuar." />
      <AtalhosInicio />
    </>
  );
}
