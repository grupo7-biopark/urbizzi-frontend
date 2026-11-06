import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { UserMenu } from '@/features/auth/components/user-menu';
import { AppShell } from '@/features/navegacao/components/app-shell';
import { USUARIO_ATUAL_KEY } from '@/shared/auth/usuario-atual.queries';
import { getUsuarioAtual } from '@/shared/auth/usuario-atual.server';
import { ToastProvider } from '@/shared/ui/toast';

// Sem `loading.tsx` neste grupo: com ele, a resposta começa antes da conferência
// de permissão, e a tela 403 sairia com status 200.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const usuario = await getUsuarioAtual();

  // Evita que `useUsuarioAtual()` repita no navegador a busca feita aqui.
  const queryClient = new QueryClient();
  queryClient.setQueryData(USUARIO_ATUAL_KEY, usuario);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ToastProvider>
        <AppShell userMenu={<UserMenu />}>{children}</AppShell>
      </ToastProvider>
    </HydrationBoundary>
  );
}
