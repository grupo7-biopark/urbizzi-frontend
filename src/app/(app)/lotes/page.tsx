import type { Metadata } from 'next';
import { ImportarLotesLink } from '@/features/lotes/components/importacao-lotes';
import {
  LotesTable,
  NovoLoteLink,
} from '@/features/lotes/components/lotes-table';
import { lotesSearchSchema } from '@/features/lotes/schemas/lotes-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { Permitido } from '@/shared/auth/permitido';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Lotes' };

export default async function LotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissao('verMapaLotesPainel');
  const search = lotesSearchSchema.parse(await searchParams);

  return (
    <>
      <PageHeader
        title="Lotes"
        parents={[{ label: 'Início', href: '/' }]}
        actions={
          <Permitido acao="gerenciarCadastros">
            <div className="flex flex-wrap gap-2">
              <ImportarLotesLink />
              <NovoLoteLink />
            </div>
          </Permitido>
        }
      />
      <LotesTable search={search} />
    </>
  );
}
