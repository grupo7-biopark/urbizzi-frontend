import type { ComponentProps } from 'react';
import { cn } from './cn';

type SwitchProps = Omit<ComponentProps<'input'>, 'type' | 'role'> & {
  label: string;
};

export function Switch({ label, className, ...props }: SwitchProps) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 text-body has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
    >
      <span className="relative inline-flex h-6 w-11 shrink-0">
        <input
          type="checkbox"
          // O `checked` do input nativo já expõe o estado; `aria-checked` seria redundante.
          // oxlint-disable-next-line jsx-a11y/role-has-required-aria-props
          role="switch"
          className="peer absolute inset-0 m-0 cursor-[inherit] opacity-0"
          {...props}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 border border-ink-muted bg-surface transition-colors duration-150 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
        />
        <span
          aria-hidden="true"
          className="absolute top-1 left-1 size-4 bg-ink transition-[translate,background-color] duration-150 peer-checked:translate-x-5 peer-checked:bg-on-accent"
        />
      </span>
      {label}
    </label>
  );
}
