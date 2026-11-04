'use client';

import { getErrorMessage } from '@/shared/api/errors';
import { useUsuarioAtual } from '@/shared/auth/use-usuario-atual';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { useLogout } from '../hooks/use-logout';

export function UserMenu() {
  const { data: usuario, isPending } = useUsuarioAtual();
  const logout = useLogout();

  return (
    <div className="flex items-center gap-4">
      {isPending ? (
        <Skeleton aria-label="Carregando usuário" className="h-5 w-32" />
      ) : (
        <span className="text-small">{usuario?.nome}</span>
      )}
      {logout.error ? (
        <p role="alert" className="text-small text-danger">
          {getErrorMessage(logout.error)}
        </p>
      ) : null}
      <Button
        variant="secundario"
        disabled={logout.isPending || logout.isSuccess}
        onClick={() => logout.mutate()}
      >
        Sair
      </Button>
    </div>
  );
}
