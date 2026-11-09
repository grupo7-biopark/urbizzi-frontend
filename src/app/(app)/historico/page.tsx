import type { Metadata } from 'next';
import { HistoricoLista } from '@/features/historico/components/historico-lista';
import { historicoSearchSchema } from '@/features/historico/schemas/historico-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Histórico' };

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissao('verHistorico');

  return (
    <HistoricoLista search={historicoSearchSchema.parse(await searchParams)} />
  );
}
