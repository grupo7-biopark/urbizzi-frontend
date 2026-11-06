import type { ReactNode } from 'react';
import { Logo } from '@/shared/ui/logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Bloco de marca: sobre laranja, só o logo e o texto em preto. */}
      <aside className="hidden w-1/2 flex-col justify-between bg-accent p-12 text-on-accent lg:flex">
        <Logo
          variant="laranja"
          assinatura="tagline"
          className="h-20 w-auto self-start"
        />
        <p className="max-w-md text-heading text-balance">
          Loteamentos, quadras, lotes, reservas e propostas em um só lugar.
        </p>
      </aside>
      <main className="flex w-full items-center justify-center p-4 lg:w-1/2">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Logo
            assinatura="tagline"
            className="h-16 w-auto self-start lg:hidden"
          />
          {children}
        </div>
      </main>
    </div>
  );
}
