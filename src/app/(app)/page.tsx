import type { Metadata } from 'next';
import { AtalhosInicio } from '@/features/navegacao/components/atalhos-inicio';
import { PainelIndicadores } from '@/features/painel/components/painel-indicadores';
import { painelSearchSchema } from '@/features/painel/schemas/painel-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { podeExecutar } from '@/shared/auth/permissoes';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Início' };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirPermissao('verMapaLotesPainel');
  const search = painelSearchSchema.parse(await searchParams);

  return (
    <>
      <PageHeader title="Início" description="Painel de indicadores" />
      <PainelIndicadores
        search={search}
        podeListar={podeExecutar(usuario, 'listarReservas')}
        minhas={!podeExecutar(usuario, 'verTodasReservas')}
      />
      <AtalhosInicio />
    </>
  );
}
