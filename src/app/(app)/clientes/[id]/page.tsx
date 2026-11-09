import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ClienteDetalhe } from '@/features/clientes/components/cliente-detalhe';
import {
  clienteIdSchema,
  clientesSearchSchema,
} from '@/features/clientes/schemas/clientes-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { podeExecutar } from '@/shared/auth/permissoes';

// O nome do cliente não entra no título da aba nem no histórico do navegador.
export const metadata: Metadata = { title: 'Detalhe do cliente' };

export default async function ClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirPermissao('verClientes');
  const id = clienteIdSchema.safeParse((await params).id);
  if (!id.success) notFound();

  return (
    <ClienteDetalhe
      id={id.data}
      search={clientesSearchSchema.parse(await searchParams)}
      podeEditar={podeExecutar(usuario, 'gerenciarClientes')}
    />
  );
}
