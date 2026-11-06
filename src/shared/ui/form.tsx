'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import {
  FormProvider,
  get,
  useController,
  useForm,
  useFormContext,
  useFormState,
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
  type UseFormSetError,
} from 'react-hook-form';
import type { z } from 'zod';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Alert } from './alert';
import { Button, buttonClasses } from './button';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { MaskedInput, type MaskName } from './masked-input';
import { Select } from './select';
import { Textarea } from './textarea';

/**
 * Leva o erro da API ao lugar certo: `details` embaixo de cada campo e o resto no
 * alerta do formulário. O alerta aparece também com os campos, porque a API pode
 * citar um campo que esta tela não mostra.
 */
export function applyApiError<Values extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<Values>,
  fieldsByCode: Partial<Record<string, Path<Values>>> = {},
) {
  if (error instanceof ApiError) {
    const field = fieldsByCode[error.code];

    if (field) {
      setError(field, { message: error.message }, { shouldFocus: true });
      return;
    }

    error.details.forEach((detail, index) => {
      setError(
        detail.field as Path<Values>,
        { message: detail.messages[0] },
        { shouldFocus: index === 0 },
      );
    });
  }

  setError('root', { message: getErrorMessage(error) });
}

type FormProps<Input extends FieldValues, Output> = {
  schema: z.ZodType<Output, Input>;
  defaultValues: DefaultValues<Input>;
  /** Rejeite com o `ApiError` para o erro aparecer no formulário (`mutateAsync`). */
  onSubmit: (values: Output) => Promise<unknown>;
  submitLabel?: string;
  /** Para onde "Cancelar" volta. O botão fica ao lado do de enviar. */
  cancelHref?: string;
  /** Códigos de erro que dizem respeito a um campo (`LOTEAMENTO_JA_EXISTE`: `nome`). */
  fieldsByCode?: Partial<Record<string, Path<Input>>>;
  children: ReactNode;
};

export function Form<Input extends FieldValues, Output>({
  schema,
  defaultValues,
  onSubmit,
  submitLabel = 'Salvar',
  cancelHref,
  fieldsByCode,
  children,
}: FormProps<Input, Output>) {
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema) as Resolver<Input, unknown, Output>,
    defaultValues,
  });
  const { errors, isSubmitting } = form.formState;

  async function handleValid(values: Output) {
    try {
      await onSubmit(values);
    } catch (error) {
      applyApiError(error, form.setError, fieldsByCode);
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(handleValid)(event)}
        noValidate
        className="flex flex-col gap-5"
      >
        {children}
        {errors.root ? <Alert>{errors.root.message}</Alert> : null}
        <div className="flex flex-wrap gap-2 border-t border-border pt-5 *:grow sm:*:grow-0">
          <Button type="submit" loading={isSubmitting}>
            {submitLabel}
          </Button>
          {cancelHref ? (
            <Link href={cancelHref} className={buttonClasses('secundario')}>
              Cancelar
            </Link>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}

/** Aceita caminho aninhado (`endereco.cep`), como os `details` da API. */
function useFieldError(name: string) {
  const { errors } = useFormState({ name });
  const error = get(errors, name) as { message?: string } | undefined;

  return error?.message;
}

type NamedField<Props> = Omit<Props, 'name' | 'error'> & { name: string };

export function FormInput({
  name,
  ...props
}: NamedField<ComponentProps<typeof Input>>) {
  const { register } = useFormContext();
  const error = useFieldError(name);

  return <Input {...props} {...register(name)} error={error} />;
}

export function FormTextarea({
  name,
  ...props
}: NamedField<ComponentProps<typeof Textarea>>) {
  const { register } = useFormContext();
  const error = useFieldError(name);

  return <Textarea {...props} {...register(name)} error={error} />;
}

export function FormSelect({
  name,
  ...props
}: NamedField<ComponentProps<typeof Select>>) {
  const { register } = useFormContext();
  const error = useFieldError(name);

  return <Select {...props} {...register(name)} error={error} />;
}

export function FormCheckbox({
  name,
  ...props
}: NamedField<ComponentProps<typeof Checkbox>>) {
  const { register } = useFormContext();
  const error = useFieldError(name);

  return <Checkbox {...props} {...register(name)} error={error} />;
}

type FormMaskedInputProps = NamedField<
  Omit<ComponentProps<typeof MaskedInput>, 'value' | 'onChange' | 'mask'>
> & { mask: MaskName };

/** O formulário guarda o valor sem máscara, no formato que a API espera. */
export function FormMaskedInput({ name, ...props }: FormMaskedInputProps) {
  const { field, fieldState } = useController({ name });

  return (
    <MaskedInput
      {...props}
      {...field}
      value={field.value as string | null | undefined}
      error={fieldState.error?.message}
    />
  );
}
