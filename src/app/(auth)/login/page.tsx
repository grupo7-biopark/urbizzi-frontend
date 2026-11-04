import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';
import { getSafeRedirect } from '@/shared/auth/session-paths';

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { redirect } = await searchParams;

  return (
    <>
      <h1 className="text-heading">Entrar</h1>
      <LoginForm redirectTo={getSafeRedirect(redirect)} />
    </>
  );
}
