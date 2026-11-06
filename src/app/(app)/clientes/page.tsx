import type { Metadata } from 'next';
import { TelaProvisoria } from '@/features/navegacao/components/tela-provisoria';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Clientes' };

export default async function ClientesPage() {
  await exigirPermissao('verClientes');

  return <TelaProvisoria titulo="Clientes" />;
}
