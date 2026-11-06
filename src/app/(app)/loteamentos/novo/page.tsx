import type { Metadata } from 'next';
import { NovoLoteamentoForm } from '@/features/loteamentos/components/loteamento-form';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Novo loteamento' };

export default async function NovoLoteamentoPage() {
  await exigirPermissao('gerenciarCadastros');

  return (
    <>
      <PageHeader
        title="Novo loteamento"
        parents={[
          { label: 'Início', href: '/' },
          { label: 'Loteamentos', href: '/loteamentos' },
        ]}
      />
      <NovoLoteamentoForm />
    </>
  );
}
