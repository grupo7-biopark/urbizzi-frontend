'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, type ReactNode } from 'react';
import { usePermissao } from '@/shared/auth/use-permissao';
import { cn } from '@/shared/ui/cn';
import { agruparItens, getItemAtivo, ITENS_MENU } from '../menu';

export function MenuNavegacao({
  onNavigate,
  pendencias,
}: {
  onNavigate?: () => void;
  pendencias?: ReactNode;
}) {
  const pode = usePermissao();
  const itemAtivo = getItemAtivo(usePathname());
  // A barra lateral e a gaveta podem estar no DOM ao mesmo tempo.
  const idBase = useId();
  const grupos = agruparItens(ITENS_MENU.filter((item) => pode(item.acao)));

  return (
    <nav aria-label="Menu principal" className="flex flex-col gap-5">
      {grupos.map(({ grupo, itens }) => {
        const tituloId = `${idBase}-${grupo}`;

        return (
          <div key={grupo} className="flex flex-col gap-1">
            <p
              id={tituloId}
              className="px-3 font-display text-body tracking-wide text-ink-muted"
            >
              {grupo}
            </p>
            <ul aria-labelledby={tituloId} className="flex flex-col gap-0.5">
              {itens.map((item) => {
                const ativo = item === itemAtivo;
                const Icone = item.icone;

                return (
                  <li key={item.href}>
                    {/* Sem pré-carregar: cada tela consulta a API, e o menu aparece em toda página. */}
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={onNavigate}
                      {...(ativo ? { 'aria-current': 'page' } : {})}
                      className={cn(
                        'flex min-h-11 items-center gap-3 px-3 py-2 text-small transition-colors duration-150 lg:min-h-10',
                        ativo
                          ? 'bg-accent font-bold text-on-accent'
                          : 'hover:bg-surface-hover',
                      )}
                    >
                      <Icone className="size-4" />
                      {item.label}
                      {item.href === '/propostas/pendencias'
                        ? pendencias
                        : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
