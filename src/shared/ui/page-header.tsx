import Link from 'next/link';
import type { ReactNode } from 'react';
import { IconChevronDireita } from './icon';

export type BreadcrumbItem = { label: string; href: string };

type PageHeaderProps = {
  title: string;
  /** Uma frase sobre a tela, quando o título não basta. */
  description?: string;
  /** Telas acima desta, da mais alta à mais próxima. A atual entra sozinha, pelo título. */
  parents?: BreadcrumbItem[];
  /** Ação primária da tela. */
  actions?: ReactNode;
};

/** Título (o `h1` da tela), trilha de navegação e ação primária. */
export function PageHeader({
  title,
  description,
  parents = [],
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      {parents.length > 0 ? (
        <nav aria-label="Trilha de navegação">
          <ol className="flex flex-wrap items-center gap-x-1 text-small text-ink-muted">
            {parents.map((parent) => (
              <li key={parent.href} className="flex items-center gap-1">
                <Link
                  href={parent.href}
                  className="-my-1 inline-block py-1 underline-offset-2 hover:text-ink hover:underline"
                >
                  {parent.label}
                </Link>
                <IconChevronDireita className="size-3.5" />
              </li>
            ))}
            <li aria-current="page" className="font-bold wrap-anywhere">
              {title}
            </li>
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-heading wrap-anywhere">{title}</h1>
          {description ? <p className="text-ink-muted">{description}</p> : null}
        </div>
        {actions}
      </div>
    </header>
  );
}
