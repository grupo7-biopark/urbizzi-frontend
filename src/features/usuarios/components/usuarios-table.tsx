'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { IconEditar, IconMais } from '@/shared/ui/icon';
import { FilterBar, UrlSelectFilter } from '@/shared/ui/list-filters';
import type { Usuario } from '../api/usuarios.api';
import { usuariosListOptions } from '../api/usuarios.queries';
import { useAtivarUsuario, useDesativarUsuario } from '../hooks/use-usuarios';
import { ROTULOS_DOS_PERFIS } from '../schemas/usuario-form.schema';
import {
  PERFIS,
  toListUsuariosQuery,
  type UsuariosSearch,
} from '../schemas/usuarios-search.schema';

const OPCOES_PERFIL = PERFIS.map((perfil) => ({
  value: perfil,
  label: ROTULOS_DOS_PERFIS[perfil],
}));

const OPCOES_SITUACAO = [
  { value: 'ativos', label: 'Ativos' },
  { value: 'inativos', label: 'Inativos' },
];

function DesativarUsuario({ usuario }: { usuario: Usuario }) {
  const desativar = useDesativarUsuario();

  return (
    <ConfirmDialog
      title={`Desativar ${usuario.nome}?`}
      description="A pessoa deixa de entrar no sistema. O histórico dela é mantido, e a conta pode ser ativada de novo."
      confirmLabel="Desativar usuário"
      onConfirm={() => desativar.mutateAsync(usuario.id)}
      trigger={
        <Button
          variant="perigoSutil"
          size="compacto"
          aria-label={`Desativar ${usuario.nome}`}
        >
          Desativar
        </Button>
      }
    />
  );
}

function AtivarUsuario({ usuario }: { usuario: Usuario }) {
  const ativar = useAtivarUsuario();

  return (
    <Button
      variant="fantasma"
      size="compacto"
      aria-label={`Ativar ${usuario.nome}`}
      loading={ativar.isPending}
      onClick={() => ativar.mutate(usuario.id)}
    >
      Ativar
    </Button>
  );
}

const COLUNAS: DataTableColumn<Usuario>[] = [
  {
    id: 'nome',
    header: 'Nome',
    cell: ({ id, nome }) => (
      <Link
        href={`/usuarios/${id}/editar`}
        className="-my-1 inline-block py-1 font-bold text-ink underline-offset-2 hover:underline"
      >
        {nome}
      </Link>
    ),
  },
  { id: 'email', header: 'E-mail', cell: ({ email }) => email },
  {
    id: 'perfil',
    header: 'Perfil',
    cell: ({ perfil }) => (
      <span className="whitespace-nowrap">{ROTULOS_DOS_PERFIS[perfil]}</span>
    ),
  },
  {
    id: 'situacao',
    header: 'Situação',
    cell: ({ ativo }) =>
      ativo ? <Badge tone="disponivel">Ativo</Badge> : <Badge>Inativo</Badge>,
  },
  {
    id: 'acoes',
    header: 'Ações',
    acoes: true,
    cell: (usuario) => (
      <span className="flex gap-1 *:grow md:justify-end md:*:grow-0">
        <Link
          href={`/usuarios/${usuario.id}/editar`}
          aria-label={`Editar ${usuario.nome}`}
          className={buttonClasses('fantasma', undefined, 'compacto')}
        >
          <IconEditar className="size-4" />
          Editar
        </Link>
        {usuario.ativo ? (
          <DesativarUsuario usuario={usuario} />
        ) : (
          <AtivarUsuario usuario={usuario} />
        )}
      </span>
    ),
  },
];

export function NovoUsuarioLink() {
  return (
    <Link href="/usuarios/novo" className={buttonClasses('primario')}>
      <IconMais className="size-4" />
      Novo usuário
    </Link>
  );
}

export function UsuariosTable({ search }: { search: UsuariosSearch }) {
  const query = useQuery(usuariosListOptions(toListUsuariosQuery(search)));

  return (
    <>
      <FilterBar>
        <UrlSelectFilter name="perfil" label="Perfil" options={OPCOES_PERFIL} />
        <UrlSelectFilter
          name="situacao"
          label="Situação"
          options={OPCOES_SITUACAO}
        />
      </FilterBar>
      <DataTable
        label="Usuários"
        query={query}
        columns={COLUNAS}
        getRowKey={({ id }) => id}
        emptyTitle="Nenhum usuário cadastrado"
        emptyAction={<NovoUsuarioLink />}
      />
    </>
  );
}
