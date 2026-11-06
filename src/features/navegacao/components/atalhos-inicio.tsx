'use client';

import Link from 'next/link';
import { useId } from 'react';
import { usePermissao } from '@/shared/auth/use-permissao';
import { agruparItens, ITENS_MENU } from '../menu';

/** Mostra só o que o perfil pode abrir, com a mesma regra do menu. */
export function AtalhosInicio() {
  const pode = usePermissao();
  const idBase = useId();
  const grupos = agruparItens(
    ITENS_MENU.filter((item) => item.href !== '/' && pode(item.acao)),
  );

  return (
    <div className="flex flex-col gap-8">
      {grupos.map(({ grupo, itens }) => {
        const tituloId = `${idBase}-${grupo}`;

        return (
          <section
            key={grupo}
            aria-labelledby={tituloId}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <h2 id={tituloId} className="font-display text-section-label">
                {grupo}
              </h2>
              <span aria-hidden="true" className="h-px grow bg-border" />
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {itens.map(({ href, label, descricao, icone: Icone }) => (
                <li key={href} className="flex">
                  <Link
                    href={href}
                    prefetch={false}
                    className="group flex w-full items-start gap-3 border border-border bg-surface-panel p-4 transition-colors duration-150 hover:border-ink"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center bg-surface-hover transition-colors duration-150 group-hover:bg-accent group-hover:text-on-accent">
                      <Icone />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-bold">{label}</span>
                      <span className="text-small text-ink-muted">
                        {descricao}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
