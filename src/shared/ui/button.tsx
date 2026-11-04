import type { ComponentProps } from 'react';
import { cn } from './cn';

const VARIANT_CLASSES = {
  primario:
    'border-accent bg-accent text-on-accent enabled:hover:border-ink enabled:hover:bg-ink enabled:hover:text-surface',
  secundario: 'border-ink text-ink enabled:hover:bg-surface-alt',
  perigo:
    'border-danger bg-danger text-on-danger enabled:hover:border-ink enabled:hover:bg-ink enabled:hover:text-surface',
  fantasma: 'border-transparent text-ink enabled:hover:bg-surface-alt',
};

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
};

export function Button({
  variant = 'primario',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 border px-4 py-2 text-small font-bold',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
