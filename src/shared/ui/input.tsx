import type { ComponentProps } from 'react';
import { cn } from './cn';
import {
  CONTROL_CLASSES,
  FieldLayout,
  useFieldControl,
  type FieldProps,
} from './label';

type InputProps = ComponentProps<'input'> & FieldProps;

export function Input({
  label,
  error,
  hint,
  id,
  required,
  className,
  ...props
}: InputProps) {
  const { controlProps, hintId, errorId } = useFieldControl({
    label,
    error,
    hint,
    id,
    required,
  });

  return (
    <FieldLayout
      label={label}
      error={error}
      hint={hint}
      required={required}
      controlId={controlProps.id}
      hintId={hintId}
      errorId={errorId}
    >
      <input
        className={cn(CONTROL_CLASSES, 'min-h-10', className)}
        {...controlProps}
        {...props}
      />
    </FieldLayout>
  );
}
