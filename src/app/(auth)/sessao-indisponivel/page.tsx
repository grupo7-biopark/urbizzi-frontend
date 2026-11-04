import type { Metadata } from 'next';
import { getSafeRedirect } from '@/shared/auth/session-paths';

export const metadata: Metadata = { title: 'Sessão indisponível' };

export default async function SessaoIndisponivelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { redirect } = await searchParams;

  return (
    <>
      <h1 className="text-heading">Não foi possível confirmar sua sessão</h1>
      <p>
        O serviço está temporariamente indisponível. Sua sessão foi mantida.
      </p>
      {/* Navegação completa: a confirmação da sessão acontece no servidor. */}
      <a href={getSafeRedirect(redirect)} className="text-ink underline">
        Tentar novamente
      </a>
    </>
  );
}
