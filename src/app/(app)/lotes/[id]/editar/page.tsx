import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EditarLote } from '@/features/lotes/components/editar-lote';
import { loteIdSchema } from '@/features/lotes/schemas/lotes-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Editar lote' };

export default async function EditarLotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPermissao('gerenciarCadastros');
  const { success, data: id } = loteIdSchema.safeParse((await params).id);

  if (!success) {
    notFound();
  }

  return <EditarLote id={id} />;
}
