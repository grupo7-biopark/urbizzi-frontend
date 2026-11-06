'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '@/shared/api/errors';
import { Alert } from '@/shared/ui/alert';
import { buttonClasses } from '@/shared/ui/button';
import { Form, FormInput } from '@/shared/ui/form';
import { useRedefinirSenha } from '../hooks/use-recuperacao-senha';
import {
  redefinirSenhaSchema,
  REGRAS_DA_SENHA,
  type RedefinirSenhaValues,
} from '../schemas/recuperacao-senha.schema';

const CAMINHO = '/redefinir-senha';

type Etapa = 'formulario' | 'invalido' | 'concluido';

/**
 * O token só existe em memória: sai da URL e do histórico assim que a tela abre.
 * Por isso, recarregar a página pede um novo link.
 */
export function RedefinirSenha({ token }: { token: string | null }) {
  const redefinir = useRedefinirSenha();
  const [etapa, setEtapa] = useState<Etapa>(token ? 'formulario' : 'invalido');

  useEffect(() => {
    window.history.replaceState(null, '', CAMINHO);
  }, []);

  async function handleSubmit({ senha }: RedefinirSenhaValues) {
    try {
      await redefinir.mutateAsync({ token: token ?? '', senha });
      setEtapa('concluido');
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'TOKEN_RECUPERACAO_INVALIDO'
      ) {
        setEtapa('invalido');
        return;
      }
      throw error;
    }
  }

  if (etapa === 'concluido') {
    return (
      <>
        <h1 className="text-heading">Senha redefinida</h1>
        <output className="block">
          Sua senha foi alterada. Entre com a nova senha para continuar.
        </output>
        <Link href="/login" className={buttonClasses('primario')}>
          Ir para o login
        </Link>
      </>
    );
  }

  if (etapa === 'invalido') {
    return (
      <>
        <h1 className="text-heading">Link inválido</h1>
        <Alert>
          Este link não é válido, expirou ou já foi usado. Peça outro para
          redefinir a senha.
        </Alert>
        <Link href="/recuperar-senha" className={buttonClasses('primario')}>
          Pedir outro link
        </Link>
        <Link href="/login" className={buttonClasses('secundario')}>
          Voltar para o login
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-heading">Nova senha</h1>
      <Form
        schema={redefinirSenhaSchema}
        defaultValues={{ senha: '', confirmacao: '' }}
        onSubmit={handleSubmit}
        submitLabel="Redefinir senha"
        cancelHref="/login"
      >
        <FormInput
          name="senha"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          hint={REGRAS_DA_SENHA}
          required
        />
        <FormInput
          name="confirmacao"
          label="Repita a nova senha"
          type="password"
          autoComplete="new-password"
          required
        />
      </Form>
    </>
  );
}
