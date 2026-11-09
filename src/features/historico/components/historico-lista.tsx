'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, buttonClasses } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { formatDataHora } from '@/shared/ui/datas';
import { Drawer } from '@/shared/ui/drawer';
import { Form, FormInput, FormSelect } from '@/shared/ui/form';
import { LinhaDoTempo } from '@/shared/ui/linha-do-tempo';
import { PageHeader } from '@/shared/ui/page-header';
import { Panel } from '@/shared/ui/panel';
import { useListParams } from '@/shared/ui/use-list-params';
import { historicoListOptions } from '../api/historico.queries';
import {
  historicoFiltrosSchema,
  TIPOS_ENTIDADE,
  type HistoricoSearch,
} from '../schemas/historico-search.schema';
import { AlteracoesHistorico } from './alteracoes-historico';
import type { Historico } from '../api/historico.api';
function autor(h: Historico) {
  return typeof h.usuario?.nome === 'string'
    ? h.usuario.nome
    : 'Sistema / usuário indisponível';
}
const COLUNAS: import('@/shared/ui/data-table').DataTableColumn<Historico>[] = [
  {
    id: 'data',
    header: 'Data e hora',
    cell: (h) => (
      <time dateTime={h.createdAt}>{formatDataHora(h.createdAt)}</time>
    ),
  },
  { id: 'usuario', header: 'Usuário', cell: autor },
  {
    id: 'entidade',
    header: 'Entidade',
    cell: (h) => (
      <>
        <span className="font-bold">{h.entidadeTipo}</span>
        <span className="mt-1 block text-caption text-ink-muted">
          {h.entidadeId}
        </span>
      </>
    ),
  },
  {
    id: 'acao',
    header: 'Ação',
    cell: (h) => h.acao.toLowerCase().replaceAll('_', ' '),
  },
  {
    id: 'detalhe',
    header: 'Detalhes',
    acoes: true,
    cell: (h) => (
      <Drawer
        title="Detalhes da alteração"
        side="bottom"
        trigger={
          <Button variant="secundario" size="compacto">
            Ver alteração
          </Button>
        }
      >
        <LinhaDoTempo
          itens={[
            {
              id: h.id,
              data: h.createdAt,
              titulo: `${h.entidadeTipo} · ${h.acao.toLowerCase().replaceAll('_', ' ')}`,
              autor: autor(h),
              detalhe: <AlteracoesHistorico registro={h} />,
            },
          ]}
        />
      </Drawer>
    ),
  },
];
export function HistoricoLista({ search }: { search: HistoricoSearch }) {
  const { setParams } = useListParams();
  const intervaloInvalido = Boolean(
    search.dataDe && search.dataAte && search.dataDe > search.dataAte,
  );
  const query = useQuery({
    ...historicoListOptions(search),
    enabled: !intervaloInvalido,
  });
  return (
    <>
      <PageHeader
        title="Histórico"
        description="Alterações mais recentes primeiro. O acesso aos registros respeita as permissões da sua conta."
        parents={[{ label: 'Início', href: '/' }]}
      />
      <Panel title="Filtrar alterações">
        <Form
          key={JSON.stringify(search)}
          schema={historicoFiltrosSchema}
          defaultValues={{
            entidadeTipo: search.entidadeTipo ?? '',
            entidadeId: search.entidadeId ?? '',
            usuarioId: search.usuarioId ?? '',
            dataDe: search.dataDe ?? '',
            dataAte: search.dataAte ?? '',
          }}
          onSubmit={async (v) => setParams(v)}
          submitLabel="Aplicar filtros"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormSelect name="entidadeTipo" label="Tipo de entidade">
              <option value="">Todos</option>
              {TIPOS_ENTIDADE.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </FormSelect>
            <FormInput
              name="entidadeId"
              label="ID da entidade"
              hint="Identificador do lote, cliente ou outro registro."
            />
            <FormInput
              name="usuarioId"
              label="ID do usuário"
              hint="Use o identificador; nomes não são enviados à URL."
            />
            <FormInput name="dataDe" label="De" type="date" />
            <FormInput name="dataAte" label="Até" type="date" />
          </div>
          <Link href="/historico" className={buttonClasses('fantasma')}>
            Limpar filtros
          </Link>
        </Form>
      </Panel>
      {intervaloInvalido ? (
        <p role="alert">A data final deve ser igual ou posterior à inicial.</p>
      ) : (
        <DataTable
          label="Histórico"
          query={query}
          getRowKey={(h) => h.id}
          emptyTitle="Nenhuma alteração registrada"
          columns={COLUNAS}
        />
      )}
    </>
  );
}
