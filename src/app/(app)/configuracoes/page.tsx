import type { Metadata } from 'next';
import { ConfiguracoesForm } from '@/features/configuracoes/components/configuracoes-form';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Configurações' };

export default async function ConfiguracoesPage() {
  await exigirPermissao('gerenciarConfiguracoes');

  return (
    <>
      <PageHeader
        title="Configurações"
        parents={[{ label: 'Início', href: '/' }]}
      />
      <ConfiguracoesForm />
    </>
  );
}
