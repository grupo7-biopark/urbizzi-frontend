import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LoteComAcoesReserva } from './lote-com-acoes-reserva';
import { loteIdSchema } from '@/features/lotes/schemas/lotes-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { podeExecutar } from '@/shared/auth/permissoes';
import { AcaoReserva } from './acao-reserva';
export const metadata: Metadata = { title: 'Detalhe do lote' };
export default async function LotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirPermissao('verMapaLotesPainel');
  const result = loteIdSchema.safeParse((await params).id);
  if (!result.success) notFound();
  return (
    <LoteComAcoesReserva
      id={result.data}
      acaoReserva={
        podeExecutar(usuario, 'gerenciarReservas') ? (
          <AcaoReserva id={result.data} />
        ) : null
      }
    />
  );
}
