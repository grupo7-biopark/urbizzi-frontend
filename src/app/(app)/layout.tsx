import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { UserMenu } from '@/features/auth/components/user-menu';
import { USUARIO_ATUAL_KEY } from '@/shared/auth/usuario-atual.queries';
import { getUsuarioAtual } from '@/shared/auth/usuario-atual.server';
import { Logo } from '@/shared/ui/logo';
import { ToastProvider } from '@/shared/ui/toast';

// O menu e a navegação por perfil chegam na FE-08.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const usuario = await getUsuarioAtual();

  // Evita que `useUsuarioAtual()` repita no navegador a busca feita aqui.
  const queryClient = new QueryClient();
  queryClient.setQueryData(USUARIO_ATUAL_KEY, usuario);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ToastProvider>
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <Logo className="h-8 w-auto" />
          <UserMenu />
        </header>
        {children}
      </ToastProvider>
    </HydrationBoundary>
  );
}
