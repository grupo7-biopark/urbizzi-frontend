import type { Metadata } from 'next';
import { TelaProvisoria } from '@/features/navegacao/components/tela-provisoria';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Usuários' };

export default async function UsuariosPage() {
  await exigirPermissao('gerenciarUsuarios');

  return <TelaProvisoria titulo="Usuários" />;
}
