import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/shared/ui/logo';
import { AlternarTema } from '@/shared/ui/alternar-tema';
import { MenuCelular } from './menu-celular';
import { MenuNavegacao } from './menu-navegacao';

const LOGO_ALT = 'Urbizzi, página inicial';

type AppShellProps = {
  /** Usuário, perfil e sair: vêm de `features/auth`, composto pelo layout. */
  userMenu: ReactNode;
  pendencias?: ReactNode;
  children: ReactNode;
};

/**
 * Barra lateral a partir de `lg`; abaixo disso, o menu abre em uma gaveta. A barra
 * é sempre escura: `data-theme` reaplica os tokens do tema só dentro dela.
 */
export function AppShell({ userMenu, pendencias, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh">
      <nav aria-label="Acesso rápido">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:p-2"
        >
          Pular para o conteúdo
        </a>
      </nav>
      <aside
        data-theme="dark"
        className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface p-4 text-ink lg:flex"
      >
        <Link href="/" prefetch={false} className="self-start px-3 pt-1">
          <Logo alt={LOGO_ALT} className="h-8 w-auto" />
        </Link>
        <MenuNavegacao pendencias={pendencias} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-surface-canvas">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-surface-panel px-2 py-2 sm:px-4 lg:static lg:justify-end lg:px-8">
          <div className="flex min-w-0 items-center gap-1 lg:hidden">
            <MenuCelular pendencias={pendencias} />
            <Link href="/" prefetch={false} className="shrink-0">
              <Logo alt={LOGO_ALT} className="h-7 w-auto" />
            </Link>
          </div>
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <AlternarTema />
            {userMenu}
          </div>
        </header>
        <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
