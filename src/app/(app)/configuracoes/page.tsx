import type { Metadata } from 'next';
import { TelaProvisoria } from '@/features/navegacao/components/tela-provisoria';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Configurações' };

export default async function ConfiguracoesPage() {
  await exigirPermissao('gerenciarConfiguracoes');

  return <TelaProvisoria titulo="Configurações" />;
}
