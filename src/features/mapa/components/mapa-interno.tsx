'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Permitido } from '@/shared/auth/permitido';
import { StatusLoteBadge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Drawer } from '@/shared/ui/drawer';
import { EmptyState, ErrorState } from '@/shared/ui/empty-state';
import {
  FormaMarcadorIcone,
  type FormaMarcador,
} from '@/shared/ui/forma-marcador';
import { IconMapa } from '@/shared/ui/icon';
import { IndicadorConexao } from '@/shared/ui/indicador-conexao';
import { Input } from '@/shared/ui/input';
import { FilterBar, UrlSelectFilter } from '@/shared/ui/list-filters';
import { formatArea, formatMoeda } from '@/shared/ui/masks';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  ALTURA_VISUALIZADOR,
  VisualizadorPlanta,
} from '@/shared/ui/visualizador-planta';
import {
  toPlantaVisualizada,
  type MarcadorMapa,
  type StatusLoteMapa,
} from '../api/mapa.api';
import { loteamentosDoMapaOptions, mapaOptions } from '../api/mapa.queries';
import { useEventosMapa } from '../hooks/use-eventos-mapa';
import { toConsultaMapa, type MapaSearch } from '../schemas/mapa-search.schema';

const MAXIMO_RESULTADOS = 8;

const STATUS_DO_MAPA: Record<
  StatusLoteMapa,
  { label: string; cor: string; forma: FormaMarcador }
> = {
  DISPONIVEL: {
    label: 'Disponível',
    cor: '--status-disponivel',
    forma: 'circulo',
  },
  RESERVADO: {
    label: 'Reservado',
    cor: '--status-reservado',
    forma: 'quadrado',
  },
  VENDIDO: { label: 'Vendido', cor: '--status-vendido', forma: 'triangulo' },
  BLOQUEADO: {
    label: 'Bloqueado',
    cor: '--status-bloqueado',
    forma: 'losango',
  },
};

const OPCOES_STATUS = Object.entries(STATUS_DO_MAPA).map(
  ([value, { label }]) => ({ value, label }),
);

function FiltrosDoMapa() {
  const loteamentos = useQuery(loteamentosDoMapaOptions());

  return (
    <FilterBar>
      <UrlSelectFilter
        name="loteamentoId"
        label="Loteamento"
        options={(loteamentos.data?.data ?? []).map(({ id, nome }) => ({
          value: id,
          label: nome,
        }))}
      />
      <UrlSelectFilter name="status" label="Status" options={OPCOES_STATUS} />
    </FilterBar>
  );
}

function Legenda() {
  return (
    <ul
      aria-label="Legenda do mapa"
      className="flex flex-wrap gap-x-5 gap-y-2 text-small"
    >
      {Object.values(STATUS_DO_MAPA).map(({ label, cor, forma }) => (
        <li key={label} className="flex items-center gap-2">
          <FormaMarcadorIcone forma={forma} cor={cor} />
          {label}
        </li>
      ))}
    </ul>
  );
}

function descreverLote({ numero, quadra, loteamento }: MarcadorMapa) {
  return `Lote ${numero}, quadra ${quadra}, ${loteamento}`;
}

function BuscaDeLote({
  marcadores,
  onEscolher,
}: {
  marcadores: MarcadorMapa[];
  onEscolher: (marcador: MarcadorMapa) => void;
}) {
  const [texto, setTexto] = useState('');
  const busca = texto.trim().toLowerCase();
  const encontrados = busca
    ? marcadores.filter(({ numero }) => numero.toLowerCase().includes(busca))
    : [];

  return (
    <div className="flex max-w-md flex-col gap-2">
      <Input
        type="search"
        label="Buscar lote por número"
        hint="Procura nos lotes que os filtros deixam no mapa."
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
      />
      {busca && encontrados.length === 0 ? (
        <p className="text-small text-ink-muted">
          Nenhum lote com esse número no mapa.
        </p>
      ) : null}
      {encontrados.length > 0 ? (
        <ul
          aria-label="Lotes encontrados"
          className="flex flex-col border border-border"
        >
          {encontrados.slice(0, MAXIMO_RESULTADOS).map((marcador) => (
            <li key={marcador.id}>
              <Button
                variant="fantasma"
                className="w-full justify-start text-left font-normal"
                onClick={() => {
                  setTexto('');
                  onEscolher(marcador);
                }}
              >
                {descreverLote(marcador)}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {encontrados.length > MAXIMO_RESULTADOS ? (
        <p className="text-small text-ink-muted">
          Mostrando {MAXIMO_RESULTADOS} de {encontrados.length}. Digite mais do
          número para refinar.
        </p>
      ) : null}
    </div>
  );
}

function Dado({ termo, children }: { termo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-ink-muted">{termo}</dt>
      <dd className="wrap-anywhere">{children}</dd>
    </div>
  );
}

function PainelDoLote({
  marcador,
  onFechar,
  renderPainelLote,
}: {
  marcador: MarcadorMapa | undefined;
  onFechar: () => void;
  renderPainelLote?: (marcador: MarcadorMapa) => ReactNode;
}) {
  return (
    <Drawer
      side="bottom"
      title={marcador ? `Lote ${marcador.numero}` : 'Lote'}
      open={Boolean(marcador)}
      onOpenChange={(aberto) => {
        if (!aberto) {
          onFechar();
        }
      }}
    >
      {marcador && renderPainelLote ? (
        renderPainelLote(marcador)
      ) : marcador ? (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-4">
            <Dado termo="Quadra">{marcador.quadra}</Dado>
            <Dado termo="Loteamento">{marcador.loteamento}</Dado>
            <Dado termo="Área">{formatArea(marcador.areaM2)}</Dado>
            <Dado termo="Valor">
              {marcador.valor === null ? (
                <span className="text-ink-muted">Não definido</span>
              ) : (
                formatMoeda(marcador.valor)
              )}
            </Dado>
            <Dado termo="Status">
              <StatusLoteBadge status={marcador.status} />
            </Dado>
          </dl>
          <Link
            href={`/lotes/${marcador.loteId}`}
            className={buttonClasses('secundario')}
          >
            Ver detalhes do lote
          </Link>
        </div>
      ) : null}
    </Drawer>
  );
}

export function SemPlantaAtiva() {
  return (
    <EmptyState
      icon={<IconMapa />}
      title="Nenhuma planta ativa"
      description="O mapa aparece aqui quando uma versão da planta for ativada."
      action={
        <Permitido acao="gerenciarPlanta">
          <Link href="/plantas" className={buttonClasses('primario')}>
            Ir para as plantas
          </Link>
        </Permitido>
      }
    />
  );
}

export function MapaInterno({
  search,
  renderPainelLote,
}: {
  search: MapaSearch;
  renderPainelLote?: (marcador: MarcadorMapa) => ReactNode;
}) {
  const query = useQuery(mapaOptions(toConsultaMapa(search)));
  const { estado } = useEventosMapa();
  const [painelId, setPainelId] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<MarcadorMapa>();
  const [buscadoId, setBuscadoId] = useState<string | null>(null);
  const marcadores = query.data?.marcadores;
  const buscado = marcadores?.find(({ id }) => id === buscadoId);
  function selecionar(id: string) {
    setPainelId(id);
    setSelecionado(marcadores?.find((marcador) => marcador.id === id));
  }
  const marcadoresDaPlanta = useMemo(
    () =>
      marcadores?.map(({ id, x, y, status }) => ({
        id,
        x,
        y,
        cor: STATUS_DO_MAPA[status].cor,
        forma: STATUS_DO_MAPA[status].forma,
        destacado: id === buscadoId,
      })),
    [marcadores, buscadoId],
  );
  const foco = useMemo(
    () => (buscado ? { x: buscado.x, y: buscado.y } : null),
    [buscado],
  );

  if (query.isPending) {
    return (
      <Skeleton
        aria-label="Carregando o mapa"
        className={ALTURA_VISUALIZADOR}
      />
    );
  }

  if (query.isError) {
    return query.error instanceof ApiError &&
      query.error.code === 'PLANTA_ATIVA_NAO_ENCONTRADA' ? (
      <SemPlantaAtiva />
    ) : (
      <ErrorState
        message={getErrorMessage(query.error)}
        action={
          <Button variant="secundario" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  const planta = toPlantaVisualizada(query.data.planta);

  if (!planta) {
    return <SemPlantaAtiva />;
  }

  const total = query.data.marcadores.length;

  return (
    <>
      <FiltrosDoMapa />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legenda />
        <div className="flex items-center gap-3">
          <IndicadorConexao estado={estado} />
          <p className="text-small text-ink-muted tabular-nums">
            {total === 1
              ? '1 lote no mapa'
              : `${total.toLocaleString('pt-BR')} lotes no mapa`}
          </p>
        </div>
      </div>
      <BuscaDeLote
        marcadores={query.data.marcadores}
        onEscolher={({ id }) => setBuscadoId(id)}
      />
      {buscado ? (
        <div className="flex flex-wrap items-center gap-3">
          <output className="text-small font-bold">
            {descreverLote(buscado)}
          </output>
          {/* Os marcadores são desenhados em canvas: daqui, o teclado também alcança. */}
          <Button
            variant="secundario"
            size="compacto"
            onClick={() => selecionar(buscado.id)}
          >
            Ver dados do lote
          </Button>
        </div>
      ) : null}
      <VisualizadorPlanta
        planta={planta}
        marcadores={marcadoresDaPlanta}
        onMarcadorClick={selecionar}
        foco={foco}
      />
      <PainelDoLote
        marcador={
          painelId
            ? (query.data.marcadores.find(({ id }) => id === painelId) ??
              selecionado)
            : undefined
        }
        onFechar={() => {
          setPainelId(null);
          setSelecionado(undefined);
        }}
        renderPainelLote={renderPainelLote}
      />
    </>
  );
}
