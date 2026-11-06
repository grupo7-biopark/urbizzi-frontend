import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/shared/ui/logo';
import { MenuCelular } from './menu-celular';
import { MenuNavegacao } from './menu-navegacao';

const LOGO_ALT = 'Urbizzi, página inicial';

type AppShellProps = {
  /** Usuário, perfil e sair: vêm de `features/auth`, composto pelo layout. */
  userMenu: ReactNode;
  children: ReactNode;
};

/** Barra lateral a partir de `lg`; abaixo disso, o menu abre em uma gaveta. */
export function AppShell({ userMenu, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:p-2"
      >
        Pular para o conteúdo
      </a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border p-4 lg:flex">
        <Link href="/" prefetch={false} className="self-start">
          <Logo alt={LOGO_ALT} className="h-8 w-auto" />
        </Link>
        <MenuNavegacao />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 lg:justify-end">
          <div className="flex items-center gap-4 lg:hidden">
            <MenuCelular />
            <Link href="/" prefetch={false}>
              <Logo alt={LOGO_ALT} className="h-8 w-auto" />
            </Link>
          </div>
          {userMenu}
        </header>
        <main
          id="conteudo"
          tabIndex={-1}
          className="flex flex-1 flex-col gap-6 p-4 lg:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
