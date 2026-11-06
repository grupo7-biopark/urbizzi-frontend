import { useId, type ReactNode } from 'react';
import { cn } from './cn';

type PanelProps = {
  /** Rótulo curto em versal, que vira o `h2` e dá nome à seção. */
  title?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Bloco de conteúdo sobre o fundo da área de trabalho: separa com borda, sem sombra. */
export function Panel({ title, actions, className, children }: PanelProps) {
  const titleId = useId();

  if (!title) {
    return (
      <div className={cn('border border-border bg-surface-panel', className)}>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      className={cn('border border-border bg-surface-panel', className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6">
        <h2 id={titleId} className="font-display text-section-label">
          {title}
        </h2>
        {actions}
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
