'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { navigateTo } from '@/shared/auth/navigation';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useLogin } from '../hooks/use-login';
import { loginFormSchema } from '../schemas/login-form.schema';

type FieldName = 'email' | 'senha';
type FieldErrors = Partial<Record<FieldName, string>>;

function getApiFieldError(error: unknown, field: FieldName) {
  return error instanceof ApiError
    ? error.details.find((detail) => detail.field === field)?.messages[0]
    : undefined;
}

// Estado local: com dois campos e a navegação completa ao final, o `Form` não traria ganho.
export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const login = useLogin();
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const parsed = loginFormSchema.safeParse({
      email: form.get('email'),
      senha: form.get('senha'),
    });

    if (!parsed.success) {
      const { email, senha } = z.flattenError(parsed.error).fieldErrors;
      setErrors({ email: email?.[0], senha: senha?.[0] });
      return;
    }

    setErrors({});
    login.mutate(parsed.data, { onSuccess: () => navigateTo(redirectTo) });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="E-mail"
        name="email"
        type="email"
        autoComplete="username"
        required
        error={errors.email ?? getApiFieldError(login.error, 'email')}
      />
      <Input
        label="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        required
        error={errors.senha ?? getApiFieldError(login.error, 'senha')}
      />
      {login.error ? (
        <p role="alert" className="text-small text-danger">
          {getErrorMessage(login.error)}
        </p>
      ) : null}
      {/* Depois do sucesso, continua inativo até a navegação terminar. */}
      <Button type="submit" disabled={login.isPending || login.isSuccess}>
        Entrar
      </Button>
      <Link href="/recuperar-senha" className="text-small text-ink underline">
        Esqueci minha senha
      </Link>
    </form>
  );
}
