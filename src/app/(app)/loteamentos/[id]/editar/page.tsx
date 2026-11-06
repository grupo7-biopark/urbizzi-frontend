import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EditarLoteamento } from '@/features/loteamentos/components/loteamento-detalhe';
import { loteamentoIdSchema } from '@/features/loteamentos/schemas/loteamentos-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Editar loteamento' };

export default async function EditarLoteamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPermissao('gerenciarCadastros');
  const { success, data: id } = loteamentoIdSchema.safeParse((await params).id);

  if (!success) {
    notFound();
  }

  return <EditarLoteamento id={id} />;
}
