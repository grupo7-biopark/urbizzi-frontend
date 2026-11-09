'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Button, buttonClasses } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/empty-state';
import {
  Form,
  FormInput,
  FormMaskedInput,
  FormTextarea,
} from '@/shared/ui/form';
import { PageHeader, type BreadcrumbItem } from '@/shared/ui/page-header';
import { Panel } from '@/shared/ui/panel';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  findClienteByDocumento,
  type Cliente,
  type ClienteResumo,
} from '../api/clientes.api';
import { clienteDetailOptions } from '../api/clientes.queries';
import { useCreateCliente } from '../hooks/use-create-cliente';
import { useUpdateCliente } from '../hooks/use-update-cliente';
import {
  CLIENTE_FORM_VAZIO,
  clienteFormSchema,
  toClienteBody,
  toClienteForm,
  type ClienteFormInput,
  type ClienteFormValues,
} from '../schemas/cliente-form.schema';

const DOCUMENTO_DUPLICADO = 'CLIENTE_DOCUMENTO_DUPLICADO';
const FIELDS_BY_CODE = { [DOCUMENTO_DUPLICADO]: 'documento' } as const;

const PARENTS: BreadcrumbItem[] = [
  { label: 'Início', href: '/' },
  { label: 'Clientes', href: '/clientes' },
];

/**
 * Salva e, se o documento já for de outro cliente, encontra esse cadastro para
 * oferecer o link. A mensagem do campo vem da API e não repete o documento.
 */
function useSalvarCliente(
  salvar: (values: ClienteFormValues) => Promise<void>,
) {
  const [existente, setExistente] = useState<ClienteResumo | null>(null);

  async function handleSubmit(values: ClienteFormValues) {
    setExistente(null);
    try {
      await salvar(values);
    } catch (error) {
      if (error instanceof ApiError && error.code === DOCUMENTO_DUPLICADO) {
        setExistente(
          await findClienteByDocumento(values.documento).catch(() => null),
        );
      }
      throw error;
    }
  }

  return { existente, handleSubmit };
}

function Campos({ existente }: { existente: ClienteResumo | null }) {
  return (
    <>
      <FormInput name="nome" label="Nome" required maxLength={150} />
      <div className="flex flex-col gap-2">
        <FormMaskedInput
          name="documento"
          mask="cpfCnpj"
          label="CPF ou CNPJ"
          required
          autoComplete="off"
        />
        {existente ? (
          <Link
            href={`/clientes/${existente.id}`}
            className="self-start text-small font-bold text-ink underline underline-offset-2"
          >
            Abrir o cadastro de {existente.nome}
          </Link>
        ) : null}
      </div>
      <FormMaskedInput
        name="telefone"
        mask="telefone"
        label="Telefone"
        autoComplete="off"
      />
      <FormInput
        name="email"
        label="E-mail"
        type="email"
        maxLength={254}
        autoComplete="off"
      />
      <FormTextarea name="observacoes" label="Observações" />
    </>
  );
}

export function NovoClienteForm() {
  const router = useRouter();
  const create = useCreateCliente();
  const { existente, handleSubmit } = useSalvarCliente(async (values) => {
    const { id } = await create.mutateAsync(toClienteBody(values));
    router.push(`/clientes/${id}`);
  });

  return (
    <Panel className="max-w-2xl">
      <Form
        schema={clienteFormSchema}
        defaultValues={CLIENTE_FORM_VAZIO}
        onSubmit={handleSubmit}
        cancelHref="/clientes"
        fieldsByCode={FIELDS_BY_CODE}
      >
        <Campos existente={existente} />
      </Form>
    </Panel>
  );
}

function EditarClienteForm({ cliente }: { cliente: Cliente }) {
  const router = useRouter();
  const update = useUpdateCliente(cliente.id);
  const { existente, handleSubmit } = useSalvarCliente(async (values) => {
    await update.mutateAsync(toClienteBody(values));
    router.push(`/clientes/${cliente.id}`);
  });
  const defaultValues: ClienteFormInput = toClienteForm(cliente);

  return (
    <Panel className="max-w-2xl">
      <Form
        schema={clienteFormSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        cancelHref={`/clientes/${cliente.id}`}
        fieldsByCode={FIELDS_BY_CODE}
      >
        <Campos existente={existente} />
      </Form>
    </Panel>
  );
}

export function EditarCliente({ id }: { id: string }) {
  const query = useQuery(clienteDetailOptions(id));

  return (
    <>
      <PageHeader
        title={query.data ? query.data.nome : 'Cliente'}
        parents={[...PARENTS, { label: 'Detalhe', href: `/clientes/${id}` }]}
      />
      {query.isSuccess ? (
        // A chave recria o formulário com os dados novos depois de salvar.
        <EditarClienteForm key={query.data.updatedAt} cliente={query.data} />
      ) : query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          action={
            query.error instanceof ApiError &&
            query.error.statusCode === 404 ? (
              <Link href="/clientes" className={buttonClasses('secundario')}>
                Voltar aos clientes
              </Link>
            ) : (
              <Button variant="secundario" onClick={() => void query.refetch()}>
                Tentar novamente
              </Button>
            )
          }
        />
      ) : (
        <Skeleton aria-label="Carregando cliente" className="h-96 max-w-2xl" />
      )}
    </>
  );
}
