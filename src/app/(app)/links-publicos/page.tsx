import type { Metadata } from 'next';
import { LinksPublicosLista } from '@/features/links-publicos/components/links-publicos-lista';
import { linksSearchSchema } from '@/features/links-publicos/schemas/links-publicos.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Links públicos' };

export default async function LinksPublicosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissao('gerarLinkPublico');

  return (
    <LinksPublicosLista search={linksSearchSchema.parse(await searchParams)} />
  );
}
