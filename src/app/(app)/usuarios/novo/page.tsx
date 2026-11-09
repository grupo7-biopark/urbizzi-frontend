import type { Metadata } from 'next';
import { NovoUsuarioForm } from '@/features/usuarios/components/usuario-form';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Novo usuário' };

export default async function NovoUsuarioPage() {
  await exigirPermissao('gerenciarUsuarios');

  return (
    <>
      <PageHeader
        title="Novo usuário"
        parents={[
          { label: 'Início', href: '/' },
          { label: 'Usuários', href: '/usuarios' },
        ]}
      />
      <NovoUsuarioForm />
    </>
  );
}
