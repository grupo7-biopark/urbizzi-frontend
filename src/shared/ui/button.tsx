import type { ComponentProps } from 'react';
import { cn } from './cn';

// `not-disabled:` em vez de `enabled:`: `:enabled` nunca casa com `<a>`, e o link
// com aparência de botão ficaria sem hover.
const VARIANT_CLASSES = {
  primario:
    'border-accent bg-accent text-on-accent not-disabled:hover:border-ink not-disabled:hover:bg-ink not-disabled:hover:text-surface',
  secundario: 'border-ink text-ink not-disabled:hover:bg-surface-hover',
  perigo:
    'border-danger bg-danger text-on-danger not-disabled:hover:border-ink not-disabled:hover:bg-ink not-disabled:hover:text-surface',
  fantasma: 'border-transparent text-ink not-disabled:hover:bg-surface-hover',
  // `danger` não atinge 4,5:1 sobre todo fundo de hover, então o destaque inverte as cores.
  perigoSutil:
    'border-transparent text-danger not-disabled:hover:bg-danger not-disabled:hover:text-on-danger',
};

// 44px no toque; a partir de `lg`, 40px, a mesma altura dos campos.
const SIZE_CLASSES = {
  padrao: 'min-h-11 px-4 py-2 lg:min-h-10',
  compacto: 'min-h-11 px-3 py-1 md:min-h-8',
  icone: 'size-11 lg:size-10',
};

export type ButtonVariant = keyof typeof VARIANT_CLASSES;
export type ButtonSize = keyof typeof SIZE_CLASSES;

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Inativa o botão e mostra o progresso, mantendo o texto e a largura. */
  loading?: boolean;
};

/** Aparência de botão para um link: navegação continua sendo `a`, e não `button`. */
export function buttonClasses(
  variant: ButtonVariant,
  className?: string,
  size: ButtonSize = 'padrao',
) {
  return cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border text-small font-bold transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:opacity-50',
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    className,
  );
}

export function Button({
  variant = 'primario',
  size,
  type = 'button',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, className, size)}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin border-2 border-current/25 border-t-current"
        />
      ) : null}
      {children}
    </button>
  );
}
