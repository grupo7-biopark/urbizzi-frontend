import type { Metadata } from 'next';
import { EditorMarcadores } from '@/features/mapa/components/editor-marcadores';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Editar marcadores' };

export default async function EditorMarcadoresPage() {
  await exigirPermissao('gerenciarPlanta');

  return <EditorMarcadores />;
}
