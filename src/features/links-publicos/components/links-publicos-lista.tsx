'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { formatDataHora } from '@/shared/ui/datas';
import { Dialog } from '@/shared/ui/dialog';
import { ErrorState } from '@/shared/ui/empty-state';
import { getErrorMessage } from '@/shared/api/errors';
import { Form, FormSelect } from '@/shared/ui/form';
import { PageHeader } from '@/shared/ui/page-header';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  escoposOptions,
  linksListOptions,
} from '../api/links-publicos.queries';
import { useCreateLink } from '../hooks/use-links-publicos';
import { linkFormSchema } from '../schemas/links-publicos.schema';
import { AcoesLink } from './acoes-link';
import type { LinkPublico } from '../api/links-publicos.api';
function EscopoLink({ id }: { id: string | null }) {
  const escopos = useQuery(escoposOptions());
  return id
    ? (escopos.data?.find((e) => e.id === id)?.nome ?? `Loteamento ${id}`)
    : 'Todos os loteamentos';
}
const COLUNAS: import('@/shared/ui/data-table').DataTableColumn<LinkPublico>[] =
  [
    {
      id: 'escopo',
      header: 'Escopo',
      cell: (l) => <EscopoLink id={l.loteamentoId} />,
    },
    {
      id: 'criacao',
      header: 'Criado em',
      cell: (l) => (
        <time dateTime={l.createdAt}>{formatDataHora(l.createdAt)}</time>
      ),
    },
    {
      id: 'acessos',
      header: 'Acessos',
      align: 'right',
      cell: (l) => l.acessos.toLocaleString('pt-BR'),
    },
    {
      id: 'situacao',
      header: 'Situação',
      cell: (l) => (
        <Badge tone={l.ativo ? 'disponivel' : 'neutro'}>
          {l.ativo ? 'Ativo' : 'Desativado'}
        </Badge>
      ),
    },
    {
      id: 'acoes',
      header: 'Ações',
      acoes: true,
      cell: (l) => <AcoesLink link={l} />,
    },
  ];
export function LinksPublicosLista({
  search,
}: {
  search: { page: number; pageSize: number };
}) {
  const query = useQuery(linksListOptions(search));
  const escopos = useQuery(escoposOptions());
  const mutation = useCreateLink();
  const [open, setOpen] = useState(false);
  const [criado, setCriado] = useState<LinkPublico | null>(null);
  return (
    <>
      <PageHeader
        title="Links públicos"
        description="Compartilhe o mapa e acompanhe os acessos. Os links visíveis respeitam as permissões da sua conta."
        parents={[{ label: 'Início', href: '/' }]}
        actions={<Button onClick={() => setOpen(true)}>Gerar link</Button>}
      />
      <Dialog
        title="Gerar link público"
        description="Escolha um loteamento ou permita a consulta de todos no mapa público."
        open={open}
        onOpenChange={setOpen}
      >
        {escopos.isPending ? (
          <Skeleton aria-label="Carregando loteamentos" className="h-32" />
        ) : escopos.isError ? (
          <ErrorState
            message={getErrorMessage(escopos.error)}
            action={
              <Button onClick={() => void escopos.refetch()}>
                Tentar novamente
              </Button>
            }
          />
        ) : (
          <Form
            schema={linkFormSchema}
            defaultValues={{ loteamentoId: '' }}
            submitLabel="Gerar link"
            onSubmit={async (v) => {
              const novo = await mutation.mutateAsync(v);
              setCriado(novo);
              setOpen(false);
            }}
          >
            <FormSelect name="loteamentoId" label="Escopo do mapa">
              <option value="">Todos os loteamentos</option>
              {escopos.data.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </FormSelect>
          </Form>
        )}
      </Dialog>
      {criado ? (
        <Dialog
          title="Link público criado"
          open
          onOpenChange={(v) => {
            if (!v) setCriado(null);
          }}
        >
          <p className="text-small text-ink-muted">
            Envie este link ao cliente para consultar o mapa sem entrar no
            sistema.
          </p>
          <AcoesLink
            link={query.data?.data.find((l) => l.id === criado.id) ?? criado}
          />
        </Dialog>
      ) : null}
      <DataTable
        label="Links públicos"
        query={query}
        getRowKey={(l) => l.id}
        emptyTitle="Nenhum link público criado"
        emptyDescription="Gere um link para compartilhar o mapa com seus clientes."
        columns={COLUNAS}
      />
    </>
  );
}
