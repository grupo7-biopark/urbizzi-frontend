import Link from 'next/link';
import { StatusPage } from '@/shared/ui/status-page';

export default function Forbidden() {
  return (
    <StatusPage
      code="403"
      title="Acesso negado"
      description="Seu perfil não tem permissão para acessar esta página."
      action={
        <Link href="/" className="text-ink underline">
          Voltar ao início
        </Link>
      }
    />
  );
}
