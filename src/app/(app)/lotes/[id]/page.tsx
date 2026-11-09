import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LoteDetalhe } from '@/features/lotes/components/lote-detalhe';
import { loteIdSchema } from '@/features/lotes/schemas/lotes-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
export const metadata: Metadata = { title: 'Detalhe do lote' };
export default async function LotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPermissao('verMapaLotesPainel');
  const result = loteIdSchema.safeParse((await params).id);
  if (!result.success) notFound();
  return <LoteDetalhe id={result.data} />;
}
