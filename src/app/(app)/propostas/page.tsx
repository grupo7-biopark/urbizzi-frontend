import type { Metadata } from 'next';
import { TelaProvisoria } from '@/features/navegacao/components/tela-provisoria';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Propostas' };

export default async function PropostasPage() {
  await exigirPermissao('acompanharPropostas');

  return <TelaProvisoria titulo="Propostas" />;
}
