import type { Metadata } from 'next';
import {
  ClientesTable,
  NovoClienteLink,
} from '@/features/clientes/components/clientes-table';
import { clientesSearchSchema } from '@/features/clientes/schemas/clientes-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { Permitido } from '@/shared/auth/permitido';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Clientes' };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissao('verClientes');
  const search = clientesSearchSchema.parse(await searchParams);

  return (
    <>
      <PageHeader
        title="Clientes"
        parents={[{ label: 'Início', href: '/' }]}
        actions={
          <Permitido acao="gerenciarClientes">
            <NovoClienteLink />
          </Permitido>
        }
      />
      <ClientesTable search={search} />
    </>
  );
}
