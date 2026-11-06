'use client';

import { getErrorMessage } from '@/shared/api/errors';
import { ROTULOS_PERFIL } from '@/shared/auth/permissoes';
import { useUsuarioAtual } from '@/shared/auth/use-usuario-atual';
import { Button } from '@/shared/ui/button';
import { IconSair } from '@/shared/ui/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { useLogout } from '../hooks/use-logout';

function getIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const ultima = partes.length > 1 ? partes.at(-1) : undefined;

  return `${partes[0]?.[0] ?? ''}${ultima?.[0] ?? ''}`.toUpperCase();
}

export function UserMenu() {
  const { data: usuario, isPending } = useUsuarioAtual();
  const logout = useLogout();

  return (
    <div className="flex min-w-0 items-center gap-3">
      {isPending ? (
        <Skeleton aria-label="Carregando usuário" className="h-5 w-32" />
      ) : (
        usuario && (
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center bg-accent text-small font-bold text-on-accent"
            >
              {getIniciais(usuario.nome)}
            </span>
            {/* No celular, o espaço fica para o logo e o menu; as iniciais identificam a conta. */}
            <div className="hidden min-w-0 flex-col text-small sm:flex">
              <span className="truncate font-bold">{usuario.nome}</span>
              <span className="truncate text-ink-muted">
                {ROTULOS_PERFIL[usuario.perfil]}
              </span>
            </div>
          </div>
        )
      )}
      {logout.error ? (
        <p role="alert" className="max-w-48 text-small text-danger">
          {getErrorMessage(logout.error)}
        </p>
      ) : null}
      <Button
        variant="fantasma"
        size="compacto"
        aria-label="Sair"
        className="min-w-11"
        loading={logout.isPending}
        disabled={logout.isSuccess}
        onClick={() => logout.mutate()}
      >
        <IconSair className="size-4" />
        <span className="hidden sm:inline">Sair</span>
      </Button>
    </div>
  );
}
