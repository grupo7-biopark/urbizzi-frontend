import Link from 'next/link';
import type { ReactNode } from 'react';

export type BreadcrumbItem = { label: string; href: string };

type PageHeaderProps = {
  title: string;
  /** Telas acima desta, da mais alta à mais próxima. A atual entra sozinha, pelo título. */
  parents?: BreadcrumbItem[];
  /** Ação primária da tela. */
  actions?: ReactNode;
};

/** Título (o `h1` da tela), trilha de navegação e ação primária. */
export function PageHeader({ title, parents = [], actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      {parents.length > 0 ? (
        <nav aria-label="Trilha de navegação">
          <ol className="flex flex-wrap items-center gap-x-2 text-small">
            {parents.map((parent) => (
              <li key={parent.href} className="flex items-center gap-2">
                <Link href={parent.href} className="text-ink underline">
                  {parent.label}
                </Link>
                <span aria-hidden="true">/</span>
              </li>
            ))}
            <li aria-current="page" className="text-ink-muted">
              {title}
            </li>
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-heading">{title}</h1>
        {actions}
      </div>
    </header>
  );
}
