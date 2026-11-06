import type { Metadata } from 'next';
import { ImportacaoLotes } from '@/features/lotes/components/importacao-lotes';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Importar lotes' };

export default async function ImportarLotesPage() {
  await exigirPermissao('gerenciarCadastros');

  return (
    <>
      <PageHeader
        title="Importar lotes"
        parents={[
          { label: 'Início', href: '/' },
          { label: 'Lotes', href: '/lotes' },
        ]}
      />
      <ImportacaoLotes />
    </>
  );
}
