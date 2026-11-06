import type { ReactNode } from 'react';
import { cn } from './cn';
import { IconAlerta, IconVazio } from './icon';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  /** Sem borda nem fundo, para quando já está dentro de um `Panel`. */
  bare?: boolean;
};

const BLOCK_CLASSES =
  'flex flex-col items-center gap-3 p-8 text-center sm:p-12';
const FRAMED_CLASSES = 'border border-border bg-surface-panel';
const ICON_CLASSES =
  'flex size-12 items-center justify-center bg-surface-hover text-ink';

export function EmptyState({
  title,
  description,
  action,
  icon = <IconVazio />,
  bare = false,
}: EmptyStateProps) {
  return (
    <div className={cn(BLOCK_CLASSES, !bare && FRAMED_CLASSES)}>
      <span className={ICON_CLASSES}>{icon}</span>
      <div className="flex max-w-prose flex-col gap-1">
        <p className="font-bold">{title}</p>
        {description ? <p className="text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Falha ao buscar dados: a mensagem e como continuar. */
export function ErrorState({
  message,
  action,
}: {
  message: string;
  action: ReactNode;
}) {
  return (
    <div role="alert" className={cn(BLOCK_CLASSES, FRAMED_CLASSES)}>
      <span className={cn(ICON_CLASSES, 'text-danger')}>
        <IconAlerta />
      </span>
      <p className="max-w-prose">{message}</p>
      {action}
    </div>
  );
}
