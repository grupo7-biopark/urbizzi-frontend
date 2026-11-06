import type { Metadata } from 'next';
import {
  LoteamentosTable,
  NovoLoteamentoLink,
} from '@/features/loteamentos/components/loteamentos-table';
import { loteamentosSearchSchema } from '@/features/loteamentos/schemas/loteamentos-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { Permitido } from '@/shared/auth/permitido';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Loteamentos' };

export default async function LoteamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissao('verMapaLotesPainel');
  const search = loteamentosSearchSchema.parse(await searchParams);

  return (
    <>
      <PageHeader
        title="Loteamentos"
        parents={[{ label: 'Início', href: '/' }]}
        actions={
          <Permitido acao="gerenciarCadastros">
            <NovoLoteamentoLink />
          </Permitido>
        }
      />
      <LoteamentosTable search={search} />
    </>
  );
}
