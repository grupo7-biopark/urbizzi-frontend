import type { Metadata } from 'next';
import { NovoClienteForm } from '@/features/clientes/components/cliente-form';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Novo cliente' };

export default async function NovoClientePage() {
  await exigirPermissao('gerenciarClientes');

  return (
    <>
      <PageHeader
        title="Novo cliente"
        parents={[
          { label: 'Início', href: '/' },
          { label: 'Clientes', href: '/clientes' },
        ]}
      />
      <NovoClienteForm />
    </>
  );
}
