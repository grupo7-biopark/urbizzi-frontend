import type { Metadata } from 'next';
import { TelaProvisoria } from '@/features/navegacao/components/tela-provisoria';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Histórico' };

export default async function HistoricoPage() {
  await exigirPermissao('verHistorico');

  return <TelaProvisoria titulo="Histórico" />;
}
