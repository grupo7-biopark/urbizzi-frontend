import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EditarCliente } from '@/features/clientes/components/cliente-form';
import { clienteIdSchema } from '@/features/clientes/schemas/clientes-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';

// O título não leva o nome: ele iria para o histórico do navegador (LGPD).
export const metadata: Metadata = { title: 'Cliente' };

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPermissao('gerenciarClientes');
  const { success, data: id } = clienteIdSchema.safeParse((await params).id);

  if (!success) {
    notFound();
  }

  return <EditarCliente id={id} />;
}
