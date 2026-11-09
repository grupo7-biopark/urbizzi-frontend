import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EditarUsuario } from '@/features/usuarios/components/usuario-form';
import { usuarioIdSchema } from '@/features/usuarios/schemas/usuarios-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Editar usuário' };

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPermissao('gerenciarUsuarios');
  const { success, data: id } = usuarioIdSchema.safeParse((await params).id);

  if (!success) {
    notFound();
  }

  return <EditarUsuario id={id} />;
}
