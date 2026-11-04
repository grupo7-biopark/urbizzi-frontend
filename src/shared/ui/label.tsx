import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';
import { cn } from './cn';

type LabelProps = ComponentProps<'label'> & {
  required?: boolean;
};

export function Label({ required, className, children, ...props }: LabelProps) {
  return (
    <label className={cn('text-small font-bold', className)} {...props}>
      {children}
      {required ? <span aria-hidden="true"> *</span> : null}
    </label>
  );
}

export function FieldError({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      role="alert"
      className={cn('text-small text-danger', className)}
      {...props}
    />
  );
}

export type FieldControlProps = {
  id: string;
  required?: boolean;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
};

export type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
  required?: boolean;
};

/** Liga rótulo, dica e erro ao controle, para o leitor de tela anunciar os três. */
export function useFieldControl({ id, error, hint, required }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-dica` : undefined;
  const errorId = error ? `${controlId}-erro` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ');

  const controlProps: FieldControlProps = {
    id: controlId,
    required,
    ...(error ? { 'aria-invalid': true } : {}),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
  };

  return { controlProps, hintId, errorId };
}

type FieldLayoutProps = FieldProps & {
  controlId: string;
  hintId?: string;
  errorId?: string;
  children: ReactNode;
};

export function FieldLayout({
  label,
  error,
  hint,
  required,
  controlId,
  hintId,
  errorId,
  children,
}: FieldLayoutProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={controlId} required={required}>
        {label}
      </Label>
      {children}
      {hint ? (
        <p id={hintId} className="text-small text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

/** A borda precisa de 3:1 sobre o fundo; o token `border` (prata) é só decorativo. */
export const CONTROL_CLASSES =
  'w-full border border-ink-muted bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger';
