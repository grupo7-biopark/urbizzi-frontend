'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermissao } from '@/shared/auth/use-permissao';
import { cn } from '@/shared/ui/cn';
import { getItemAtivo, ITENS_MENU } from '../menu';

export function MenuNavegacao({ onNavigate }: { onNavigate?: () => void }) {
  const pode = usePermissao();
  const itemAtivo = getItemAtivo(usePathname());

  return (
    <nav aria-label="Menu principal">
      <ul className="flex flex-col gap-1">
        {ITENS_MENU.filter((item) => pode(item.acao)).map((item) => {
          const ativo = item === itemAtivo;

          return (
            <li key={item.href}>
              {/* Sem pré-carregar: cada tela consulta a API, e o menu aparece em toda página. */}
              <Link
                href={item.href}
                prefetch={false}
                onClick={onNavigate}
                {...(ativo ? { 'aria-current': 'page' } : {})}
                className={cn(
                  'flex min-h-10 items-center border-l-4 px-3 py-2 text-small hover:bg-surface-alt',
                  ativo ? 'border-accent font-bold' : 'border-transparent',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
