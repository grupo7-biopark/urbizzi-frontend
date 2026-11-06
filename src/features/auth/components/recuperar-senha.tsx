'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buttonClasses } from '@/shared/ui/button';
import { Form, FormInput } from '@/shared/ui/form';
import { useSolicitarRecuperacao } from '../hooks/use-recuperacao-senha';
import {
  recuperarSenhaSchema,
  type RecuperarSenhaValues,
} from '../schemas/recuperacao-senha.schema';

export function RecuperarSenha() {
  const solicitar = useSolicitarRecuperacao();
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(values: RecuperarSenhaValues) {
    await solicitar.mutateAsync(values);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <>
        <h1 className="text-heading">Confira seu e-mail</h1>
        {/* O mesmo texto, exista ou não a conta: a tela não revela quem é cliente. */}
        <output className="block">
          Se este e-mail estiver cadastrado, enviaremos um link para redefinir a
          senha. O link vale por 1 hora.
        </output>
        <Link href="/login" className={buttonClasses('secundario')}>
          Voltar para o login
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-heading">Recuperar senha</h1>
      <p className="text-ink-muted">
        Informe seu e-mail para receber o link de redefinição.
      </p>
      <Form
        schema={recuperarSenhaSchema}
        defaultValues={{ email: '' }}
        onSubmit={handleSubmit}
        submitLabel="Enviar link"
        cancelHref="/login"
      >
        <FormInput
          name="email"
          label="E-mail"
          type="email"
          autoComplete="username"
          required
        />
      </Form>
    </>
  );
}
