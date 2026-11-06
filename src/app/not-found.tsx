import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusPage } from '@/shared/ui/status-page';

export const metadata: Metadata = { title: 'Página não encontrada' };

export default function NotFound() {
  return (
    <StatusPage
      standalone
      code="404"
      title="Página não encontrada"
      description="O endereço pode estar errado, ou a página não existe mais."
      action={
        <Link href="/" className="text-ink underline">
          Voltar ao início
        </Link>
      }
    />
  );
}
