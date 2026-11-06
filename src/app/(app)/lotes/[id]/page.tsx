import type { Metadata } from 'next';
import { TelaProvisoria } from '@/features/navegacao/components/tela-provisoria';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Lote' };

/** Provisória, para o link da listagem não levar a um 404: o detalhe é da FE-17. */
export default async function LotePage() {
  await exigirPermissao('verMapaLotesPainel');

  return (
    <TelaProvisoria
      titulo="Lote"
      parents={[
        { label: 'Início', href: '/' },
        { label: 'Lotes', href: '/lotes' },
      ]}
    />
  );
}
