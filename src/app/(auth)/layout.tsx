import type { ReactNode } from 'react';
import { Logo } from '@/shared/ui/logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Logo assinatura="tagline" className="h-16 w-auto self-start" />
        {children}
      </div>
    </main>
  );
}
