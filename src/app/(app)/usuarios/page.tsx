import type { Metadata } from 'next';
import {
  NovoUsuarioLink,
  UsuariosTable,
} from '@/features/usuarios/components/usuarios-table';
import { usuariosSearchSchema } from '@/features/usuarios/schemas/usuarios-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Usuários' };

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissao('gerenciarUsuarios');
  const search = usuariosSearchSchema.parse(await searchParams);

  return (
    <>
      <PageHeader
        title="Usuários"
        parents={[{ label: 'Início', href: '/' }]}
        actions={<NovoUsuarioLink />}
      />
      <UsuariosTable search={search} />
    </>
  );
}
