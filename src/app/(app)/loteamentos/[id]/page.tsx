import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LoteamentoDetalhe } from '@/features/loteamentos/components/loteamento-detalhe';
import { loteamentoIdSchema } from '@/features/loteamentos/schemas/loteamentos-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Loteamento' };

export default async function LoteamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPermissao('verMapaLotesPainel');
  const { success, data: id } = loteamentoIdSchema.safeParse((await params).id);

  if (!success) {
    notFound();
  }

  return <LoteamentoDetalhe id={id} />;
}
