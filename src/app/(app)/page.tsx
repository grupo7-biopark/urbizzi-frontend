import type { Metadata } from 'next';
import { TelaProvisoria } from '@/features/navegacao/components/tela-provisoria';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Início' };

export default async function HomePage() {
  await exigirPermissao('verMapaLotesPainel');

  return <TelaProvisoria titulo="Início" parents={[]} />;
}
