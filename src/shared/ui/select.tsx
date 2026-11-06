import type { ComponentProps } from 'react';
import { cn } from './cn';
import { IconChevronBaixo } from './icon';
import {
  CONTROL_CLASSES,
  CONTROL_HEIGHT_CLASSES,
  FieldLayout,
  useFieldControl,
  type FieldProps,
} from './label';

type SelectProps = ComponentProps<'select'> & FieldProps;

/** Usa o `<select>` nativo: teclado e seletor do celular já funcionam sem biblioteca. */
export function Select({
  label,
  error,
  hint,
  id,
  required,
  className,
  children,
  ...props
}: SelectProps) {
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
      <div className="relative">
        <select
          className={cn(
            CONTROL_CLASSES,
            CONTROL_HEIGHT_CLASSES,
            'cursor-pointer appearance-none pr-9',
            className,
          )}
          {...controlProps}
          {...props}
        >
          {children}
        </select>
        <IconChevronBaixo className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
      </div>
    </FieldLayout>
  );
}
