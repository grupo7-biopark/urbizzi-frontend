import type { Metadata } from 'next';
import { RedefinirSenha } from '@/features/auth/components/redefinir-senha';
import { tokenRecuperacaoSchema } from '@/features/auth/schemas/recuperacao-senha.schema';

// A URL traz o token: sem `no-referrer`, um link externo poderia recebê-lo.
export const metadata: Metadata = {
  title: 'Redefinir senha',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { success, data } = tokenRecuperacaoSchema.safeParse(
    (await searchParams).token,
  );

  return <RedefinirSenha token={success ? data : null} />;
}
