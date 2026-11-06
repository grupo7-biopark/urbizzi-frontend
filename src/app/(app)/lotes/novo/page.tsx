import type { Metadata } from 'next';
import { NovoLoteForm } from '@/features/lotes/components/lote-form';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Novo lote' };

export default async function NovoLotePage() {
  await exigirPermissao('gerenciarCadastros');

  return (
    <>
      <PageHeader
        title="Novo lote"
        parents={[
          { label: 'Início', href: '/' },
          { label: 'Lotes', href: '/lotes' },
        ]}
      />
      <NovoLoteForm />
    </>
  );
}
