import Link from 'next/link';
import { cn } from './cn';

type PaginationItem = number | 'reticencias';

/** Primeira, última e vizinhas da atual, com reticências onde houver salto. */
export function getPaginationItems(
  page: number,
  totalPages: number,
): PaginationItem[] {
  const pages = [1, page - 1, page, page + 1, totalPages]
    .filter((item) => item >= 1 && item <= totalPages)
    .filter((item, index, all) => all.indexOf(item) === index)
    .toSorted((a, b) => a - b);

  return pages.flatMap((item, index) => {
    const previous = pages[index - 1];

    return previous !== undefined && item - previous > 1
      ? (['reticencias', item] as const)
      : [item];
  });
}

const ITEM_CLASSES =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-1 border px-3 text-small tabular-nums transition-colors duration-150 lg:min-h-10 lg:min-w-10';

type PaginationProps = {
  meta: { page: number; totalPages: number };
  getPageHref: (page: number) => string;
  /** Diferencie quando houver mais de uma paginação na mesma tela. */
  label?: string;
  className?: string;
};

export function Pagination({
  meta,
  getPageHref,
  label = 'Paginação',
  className,
}: PaginationProps) {
  const { page, totalPages } = meta;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-1', className)}
    >
      <PageStep
        label="Anterior"
        href={page > 1 ? getPageHref(page - 1) : undefined}
      />
      {getPaginationItems(page, totalPages).map((item, index) =>
        item === 'reticencias' ? (
          <span
            key={`reticencias-${index}`}
            aria-hidden="true"
            className="px-2 text-small"
          >
            …
          </span>
        ) : (
          <Link
            key={item}
            href={getPageHref(item)}
            aria-label={`Página ${item}`}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              ITEM_CLASSES,
              item === page
                ? 'border-accent bg-accent font-bold text-on-accent'
                : 'border-transparent hover:bg-surface-hover',
            )}
          >
            {item}
          </Link>
        ),
      )}
      <PageStep
        label="Próxima"
        href={page < totalPages ? getPageHref(page + 1) : undefined}
      />
    </nav>
  );
}

function PageStep({ label, href }: { label: string; href?: string }) {
  if (!href) {
    return (
      <span
        aria-disabled="true"
        className={cn(ITEM_CLASSES, 'border-transparent opacity-50')}
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(ITEM_CLASSES, 'border-ink-muted hover:bg-surface-hover')}
    >
      {label}
    </Link>
  );
}
