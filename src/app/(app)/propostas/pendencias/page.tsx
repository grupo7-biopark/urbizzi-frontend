import type { Metadata } from 'next';
import { TelaProvisoria } from '@/features/navegacao/components/tela-provisoria';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Pendências' };

export default async function PendenciasPage() {
  await exigirPermissao('analisarPropostas');

  return (
    <TelaProvisoria
      titulo="Pendências"
      parents={[
        { label: 'Início', href: '/' },
        { label: 'Propostas', href: '/propostas' },
      ]}
    />
  );
}
