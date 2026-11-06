import type { Metadata } from 'next';
import { TelaProvisoria } from '@/features/navegacao/components/tela-provisoria';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Lotes' };

export default async function LotesPage() {
  await exigirPermissao('verMapaLotesPainel');

  return <TelaProvisoria titulo="Lotes" />;
}
