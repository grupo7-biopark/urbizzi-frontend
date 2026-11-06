'use client';

import { getErrorMessage } from '@/shared/api/errors';
import { ROTULOS_PERFIL } from '@/shared/auth/permissoes';
import { useUsuarioAtual } from '@/shared/auth/use-usuario-atual';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { useLogout } from '../hooks/use-logout';

export function UserMenu() {
  const { data: usuario, isPending } = useUsuarioAtual();
  const logout = useLogout();

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-4">
      {isPending ? (
        <Skeleton aria-label="Carregando usuário" className="h-5 w-32" />
      ) : (
        usuario && (
          <div className="flex min-w-0 flex-col text-small">
            <span className="truncate font-bold">{usuario.nome}</span>
            <span className="text-ink-muted">
              {ROTULOS_PERFIL[usuario.perfil]}
            </span>
          </div>
        )
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
