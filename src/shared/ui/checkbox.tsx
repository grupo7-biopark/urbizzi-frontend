import type { ComponentProps } from 'react';
import { cn } from './cn';
import { FieldError, useFieldControl, type FieldProps } from './label';

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & FieldProps;

export function Checkbox({
  label,
  error,
  hint,
  id,
  required,
  className,
  ...props
}: CheckboxProps) {
  const { controlProps, hintId, errorId } = useFieldControl({
    label,
    error,
    hint,
    id,
    required,
  });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="relative inline-flex size-5 shrink-0">
          <input
            type="checkbox"
            className={cn(
              'peer size-5 cursor-pointer appearance-none border border-ink-muted bg-surface transition-colors duration-150 not-disabled:hover:border-ink checked:border-accent checked:bg-accent not-disabled:checked:hover:border-accent',
              'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger',
              className,
            )}
            {...controlProps}
            {...props}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="pointer-events-none absolute inset-0.5 hidden fill-none stroke-on-accent stroke-2 peer-checked:block"
          >
            <path d="M2 6.5 5 9.5 10 3" />
          </svg>
        </span>
        <label htmlFor={controlProps.id} className="cursor-pointer text-body">
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
      </div>
      {hint ? (
        <p id={hintId} className="text-small text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
