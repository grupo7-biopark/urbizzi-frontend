import type { ComponentProps } from 'react';
import { cn } from './cn';
import { IconAlerta } from './icon';

/** Erro que não pertence a um campo: formulário, diálogo ou tela de entrada. */
export function Alert({
  className,
  children,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 border border-l-4 border-danger bg-surface-panel p-3 text-small wrap-anywhere text-ink',
        className,
      )}
      {...props}
    >
      <IconAlerta className="text-danger" />
      {children}
    </div>
  );
}
