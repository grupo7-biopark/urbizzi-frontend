import type { Metadata } from 'next';
import { TelaProvisoria } from '@/features/navegacao/components/tela-provisoria';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Links públicos' };

export default async function LinksPublicosPage() {
  await exigirPermissao('gerarLinkPublico');

  return <TelaProvisoria titulo="Links públicos" />;
}
