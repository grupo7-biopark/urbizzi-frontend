'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Button, buttonClasses } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/empty-state';
import { Form, FormInput, FormSelect } from '@/shared/ui/form';
import { PageHeader } from '@/shared/ui/page-header';
import { Panel } from '@/shared/ui/panel';
import { Skeleton } from '@/shared/ui/skeleton';
import type { Usuario } from '../api/usuarios.api';
import { usuarioDetailOptions } from '../api/usuarios.queries';
import { useCreateUsuario, useUpdateUsuario } from '../hooks/use-usuarios';
import {
  ROTULOS_DOS_PERFIS,
  usuarioEdicaoFormSchema,
  usuarioFormSchema,
  type UsuarioEdicaoFormValues,
  type UsuarioFormValues,
} from '../schemas/usuario-form.schema';
import { PERFIS } from '../schemas/usuarios-search.schema';

const PARENTS = [
  { label: 'Início', href: '/' },
  { label: 'Usuários', href: '/usuarios' },
];

/** A API não associa estes erros a um campo em `details`. */
const FIELDS_BY_CODE = {
  USUARIO_EMAIL_DUPLICADO: 'email',
  ULTIMO_ADMINISTRADOR: 'perfil',
  PERFIL_NAO_ENCONTRADO: 'perfil',
} as const;

function CamposDoUsuario() {
  return (
    <>
      <FormInput
        name="nome"
        label="Nome"
        required
        maxLength={150}
        autoComplete="off"
      />
      <FormInput
        name="email"
        label="E-mail"
        type="email"
        required
        maxLength={254}
        autoComplete="off"
      />
      <FormSelect name="perfil" label="Perfil" required>
        <option value="">Selecione</option>
        {PERFIS.map((perfil) => (
          <option key={perfil} value={perfil}>
            {ROTULOS_DOS_PERFIS[perfil]}
          </option>
        ))}
      </FormSelect>
    </>
  );
}

export function NovoUsuarioForm() {
  const router = useRouter();
  const create = useCreateUsuario();

  async function handleSubmit(values: UsuarioFormValues) {
    await create.mutateAsync(values);
    router.push('/usuarios');
  }

  return (
    <Panel className="max-w-2xl">
      <Form
        schema={usuarioFormSchema}
        defaultValues={{ nome: '', email: '', senha: '' }}
        onSubmit={handleSubmit}
        cancelHref="/usuarios"
        fieldsByCode={FIELDS_BY_CODE}
      >
        <CamposDoUsuario />
        <FormInput
          name="senha"
          label="Senha inicial"
          type="password"
          required
          autoComplete="new-password"
          hint="Use de 8 a 1024 caracteres. Combine com a pessoa um canal seguro para entregá-la."
        />
      </Form>
    </Panel>
  );
}

function EditarUsuarioForm({ usuario }: { usuario: Usuario }) {
  const router = useRouter();
  const update = useUpdateUsuario(usuario.id);

  async function handleSubmit(values: UsuarioEdicaoFormValues) {
    await update.mutateAsync(values);
    router.push('/usuarios');
  }

  return (
    <Panel className="max-w-2xl">
      <Form
        schema={usuarioEdicaoFormSchema}
        defaultValues={{
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
        }}
        onSubmit={handleSubmit}
        cancelHref="/usuarios"
        fieldsByCode={FIELDS_BY_CODE}
      >
        <CamposDoUsuario />
        <p className="text-small text-ink-muted">
          A senha não muda aqui: a própria pessoa a redefine pelo &quot;Esqueci
          minha senha&quot;. Para bloquear o acesso, desative o usuário na
          lista.
        </p>
      </Form>
    </Panel>
  );
}

export function EditarUsuario({ id }: { id: string }) {
  const query = useQuery(usuarioDetailOptions(id));

  return (
    <>
      <PageHeader
        title={query.data ? `Editar ${query.data.nome}` : 'Editar usuário'}
        parents={PARENTS}
      />
      {query.isSuccess ? <EditarUsuarioForm usuario={query.data} /> : null}
      {query.isPending ? (
        <Skeleton aria-label="Carregando usuário" className="h-80 max-w-2xl" />
      ) : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          action={
            query.error instanceof ApiError &&
            query.error.statusCode === 404 ? (
              <Link href="/usuarios" className={buttonClasses('secundario')}>
                Voltar aos usuários
              </Link>
            ) : (
              <Button variant="secundario" onClick={() => void query.refetch()}>
                Tentar novamente
              </Button>
            )
          }
        />
      ) : null}
    </>
  );
}
