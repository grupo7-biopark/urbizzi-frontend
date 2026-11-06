'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import type { PontoNormalizado } from '@/shared/ui/coordenadas-planta';
import { ErrorState } from '@/shared/ui/empty-state';
import {
  FormaMarcadorIcone,
  type FormaMarcador,
} from '@/shared/ui/forma-marcador';
import { IconSucesso } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { PageHeader } from '@/shared/ui/page-header';
import { Panel } from '@/shared/ui/panel';
import { Select } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  ALTURA_VISUALIZADOR,
  VisualizadorPlanta,
  type PlantaVisualizada,
} from '@/shared/ui/visualizador-planta';
import {
  toPlantaVisualizada,
  type LoteSemMarcador,
  type MarcadorDoEditor,
} from '../api/mapa.api';
import {
  editorDeMarcadoresOptions,
  loteamentosDoMapaOptions,
  lotesSemMarcadorOptions,
  quadraDoMapaOptions,
} from '../api/mapa.queries';
import {
  contarAlteracoes,
  getLotesPosicionados,
  temMarcadorSemLote,
} from '../hooks/alteracoes-marcadores';
import { useAvisoAoSair } from '../hooks/use-aviso-ao-sair';
import {
  useAlteracoesMarcadores,
  useRemoverMarcador,
  useRevisarMarcador,
} from '../hooks/use-editor-marcadores';
import { SemPlantaAtiva } from './mapa-interno';

const PARENTS = [
  { label: 'Início', href: '/' },
  { label: 'Mapa', href: '/mapa' },
];

const MAXIMO_NA_LISTA = 50;

const SITUACOES = {
  salvo: { label: 'Salvo', cor: '--ink', forma: 'circulo' },
  naoSalvo: { label: 'Não salvo', cor: '--accent', forma: 'quadrado' },
  semLote: { label: 'Sem lote', cor: '--danger', forma: 'losango' },
  revisar: {
    label: 'A revisar',
    cor: '--status-reservado',
    forma: 'triangulo',
  },
} satisfies Record<
  string,
  { label: string; cor: string; forma: FormaMarcador }
>;

type Situacao = keyof typeof SITUACOES;

type ItemDoEditor = PontoNormalizado & {
  chave: string;
  situacao: Situacao;
  salvo: MarcadorDoEditor | null;
  loteId: string | null;
};

function descrever({ numero, quadra, loteamento }: MarcadorDoEditor) {
  return `Lote ${numero}, quadra ${quadra}, ${loteamento}`;
}

function Legenda() {
  return (
    <ul
      aria-label="Legenda do editor"
      className="flex flex-wrap gap-x-5 gap-y-2 text-small"
    >
      {Object.values(SITUACOES).map(({ label, cor, forma }) => (
        <li key={label} className="flex items-center gap-2">
          <FormaMarcadorIcone forma={forma} cor={cor} />
          {label}
        </li>
      ))}
    </ul>
  );
}

function QuadraDoLote({ id }: { id: string }) {
  const { data } = useQuery(quadraDoMapaOptions(id));

  return data ? `quadra ${data.numero}` : 'quadra...';
}

function LotesSemMarcador({
  plantaId,
  posicionados,
  escolhidoId,
  onEscolher,
}: {
  plantaId: string;
  posicionados: Set<string>;
  escolhidoId: string | null;
  onEscolher: (lote: LoteSemMarcador) => void;
}) {
  const [loteamentoId, setLoteamentoId] = useState('');
  const [busca, setBusca] = useState('');
  const loteamentos = useQuery(loteamentosDoMapaOptions());
  const lotes = useQuery(
    lotesSemMarcadorOptions(plantaId, loteamentoId || undefined),
  );
  const nomeDoLoteamento = (id: string) =>
    loteamentos.data?.data.find((item) => item.id === id)?.nome ?? '';
  const texto = busca.trim().toLowerCase();
  const pendentes = (lotes.data ?? []).filter(
    ({ id, numero }) =>
      !posicionados.has(id) && numero.toLowerCase().includes(texto),
  );

  return (
    <Panel title="Lotes sem marcador">
      <div className="flex flex-col gap-3">
        <Select
          label="Loteamento"
          value={loteamentoId}
          onChange={(event) => setLoteamentoId(event.target.value)}
        >
          <option value="">Todos</option>
          {loteamentos.data?.data.map(({ id, nome }) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </Select>
        <Input
          type="search"
          label="Buscar por número"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
        {lotes.isPending ? (
          <Skeleton aria-label="Carregando os lotes" className="h-32" />
        ) : null}
        {lotes.isError ? <Alert>{getErrorMessage(lotes.error)}</Alert> : null}
        {lotes.isSuccess ? (
          <>
            <p className="text-small text-ink-muted tabular-nums">
              {pendentes.length === 1
                ? '1 lote sem marcador'
                : `${pendentes.length.toLocaleString('pt-BR')} lotes sem marcador`}
            </p>
            {pendentes.length > 0 ? (
              <ul
                aria-label="Lotes a posicionar"
                className="flex max-h-80 flex-col overflow-y-auto border border-border"
              >
                {pendentes.slice(0, MAXIMO_NA_LISTA).map((lote) => (
                  <li key={lote.id}>
                    <Button
                      variant="fantasma"
                      aria-pressed={lote.id === escolhidoId}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        lote.id === escolhidoId &&
                          'bg-accent text-on-accent not-disabled:hover:bg-accent',
                      )}
                      onClick={() => onEscolher(lote)}
                    >
                      <span>
                        Lote <strong>{lote.numero}</strong>,{' '}
                        <QuadraDoLote id={lote.quadraId} />,{' '}
                        {nomeDoLoteamento(lote.loteamentoId)}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            {pendentes.length > MAXIMO_NA_LISTA ? (
              <p className="text-small text-ink-muted">
                Mostrando {MAXIMO_NA_LISTA}. Use a busca ou o loteamento para
                refinar.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </Panel>
  );
}

function MarcadorSelecionado({
  plantaId,
  item,
  onMoverParaCentro,
  onDescartar,
  onRemovido,
}: {
  plantaId: string;
  item: ItemDoEditor;
  onMoverParaCentro: () => void;
  onDescartar: () => void;
  onRemovido: () => void;
}) {
  const remover = useRemoverMarcador(plantaId);
  const revisar = useRevisarMarcador(plantaId);
  const { salvo } = item;

  return (
    <Panel title="Marcador selecionado">
      <div className="flex flex-col gap-3">
        <p className="wrap-anywhere">
          {salvo ? descrever(salvo) : 'Marcador ainda não salvo.'}
        </p>
        <div>
          <Badge>{SITUACOES[item.situacao].label}</Badge>
        </div>
        <div className="flex flex-col gap-2">
          {/* Arrastar exige mouse: assim, o teclado e o toque também posicionam. */}
          <Button variant="secundario" onClick={onMoverParaCentro}>
            Mover para o centro da tela
          </Button>
          {salvo?.revisar ? (
            <Button
              variant="secundario"
              loading={revisar.isPending}
              onClick={() => revisar.mutate(salvo.id)}
            >
              <IconSucesso className="size-4" />
              Marcar como revisado
            </Button>
          ) : null}
          {salvo ? (
            <ConfirmDialog
              title={`Remover o marcador do lote ${salvo.numero}?`}
              description="O lote continua cadastrado e volta para a lista de lotes sem marcador."
              confirmLabel="Remover marcador"
              onConfirm={async () => {
                await remover.mutateAsync(salvo.id);
                onRemovido();
              }}
              trigger={<Button variant="perigoSutil">Remover marcador</Button>}
            />
          ) : (
            <Button variant="perigoSutil" onClick={onDescartar}>
              Descartar marcador
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

function ARevisar({
  marcadores,
  onEscolher,
}: {
  marcadores: MarcadorDoEditor[];
  onEscolher: (id: string) => void;
}) {
  return (
    <Panel title="A revisar">
      <div className="flex flex-col gap-2">
        <p className="text-small text-ink-muted">
          A proporção da planta mudou. Confira se estes marcadores continuam no
          lugar.
        </p>
        <ul aria-label="Marcadores a revisar" className="flex flex-col">
          {marcadores.map((marcador) => (
            <li key={marcador.id}>
              <Button
                variant="fantasma"
                className="w-full justify-start text-left font-normal"
                onClick={() => onEscolher(marcador.id)}
              >
                {descrever(marcador)}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

function Editor({
  plantaId,
  planta,
  marcadores,
}: {
  plantaId: string;
  planta: PlantaVisualizada;
  marcadores: MarcadorDoEditor[];
}) {
  const { alteracoes, dispatch, salvar } = useAlteracoesMarcadores(plantaId);
  const [escolhido, setEscolhido] = useState<LoteSemMarcador | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [centro, setCentro] = useState<PontoNormalizado>({ x: 0.5, y: 0.5 });
  const total = contarAlteracoes(alteracoes);
  const faltaLote = temMarcadorSemLote(alteracoes);
  const aviso = useAvisoAoSair(total > 0);
  const posicionados = useMemo(
    () => getLotesPosicionados(alteracoes),
    [alteracoes],
  );

  const itens = useMemo<ItemDoEditor[]>(
    () => [
      ...marcadores.map((salvo) => {
        const movido = alteracoes.movidos[salvo.id];
        const revisar: Situacao = salvo.revisar ? 'revisar' : 'salvo';

        return {
          chave: salvo.id,
          situacao: movido ? ('naoSalvo' as const) : revisar,
          salvo,
          loteId: salvo.loteId,
          x: movido?.x ?? salvo.x,
          y: movido?.y ?? salvo.y,
        };
      }),
      ...alteracoes.novos.map(({ chave, loteId, x, y }) => ({
        chave,
        situacao: loteId ? ('naoSalvo' as const) : ('semLote' as const),
        salvo: null,
        loteId,
        x,
        y,
      })),
    ],
    [marcadores, alteracoes],
  );
  const noMapa = useMemo(
    () =>
      itens.map(({ chave, x, y, situacao }) => ({
        id: chave,
        x,
        y,
        cor: SITUACOES[situacao].cor,
        forma: SITUACOES[situacao].forma,
        destacado: chave === selecionado,
      })),
    [itens, selecionado],
  );
  const itemSelecionado = itens.find(({ chave }) => chave === selecionado);
  const aRevisar = marcadores.filter(({ revisar }) => revisar);

  function criar(ponto: PontoNormalizado, loteId: string | null) {
    const chave = `novo-${crypto.randomUUID()}`;

    dispatch({ tipo: 'criar', novo: { chave, loteId, ...ponto } });
    setEscolhido(null);
    // Sem lote, a próxima escolha na lista é para este marcador.
    setSelecionado(loteId ? null : chave);
  }

  /** Um lote ainda escolhido faria o próximo clique na planta criar um marcador. */
  function selecionarMarcador(chave: string) {
    setEscolhido(null);
    setSelecionado(chave);
  }

  function aoClicarNaPlanta(ponto: PontoNormalizado) {
    criar(ponto, escolhido?.id ?? null);
  }

  function aoEscolherLote(lote: LoteSemMarcador) {
    if (itemSelecionado?.situacao === 'semLote') {
      dispatch({
        tipo: 'vincular',
        chave: itemSelecionado.chave,
        loteId: lote.id,
      });
      setSelecionado(null);
      return;
    }

    setSelecionado(null);
    setEscolhido(lote.id === escolhido?.id ? null : lote);
  }

  function getInstrucao() {
    if (itemSelecionado?.situacao === 'semLote') {
      return 'Escolha na lista o lote deste marcador.';
    }
    if (escolhido) {
      return `Clique na planta para posicionar o lote ${escolhido.numero}, ou use o botão abaixo.`;
    }
    return 'Escolha um lote e clique na planta, ou clique na planta e depois escolha o lote. Arraste um marcador para ajustar.';
  }

  return (
    <>
      <PageHeader
        title="Editar marcadores"
        parents={PARENTS}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secundario"
              disabled={total === 0 || salvar.isPending}
              onClick={() => {
                dispatch({ tipo: 'descartarTudo' });
                setSelecionado(null);
                salvar.reset();
              }}
            >
              Descartar alterações
            </Button>
            <Button
              disabled={total === 0 || faltaLote}
              loading={salvar.isPending}
              onClick={() => salvar.mutate(alteracoes)}
            >
              Salvar{total > 0 ? ` (${total})` : ''}
            </Button>
          </div>
        }
      />
      {faltaLote ? (
        <p className="text-small text-ink-muted">
          Vincule um lote a todos os marcadores novos para poder salvar.
        </p>
      ) : null}
      {salvar.isError ? (
        <Alert>
          {getErrorMessage(salvar.error)} O que não foi salvo continua pendente.
        </Alert>
      ) : null}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-3">
          <output className="block text-small font-bold">
            {getInstrucao()}
          </output>
          <Legenda />
          {escolhido ? (
            <Button
              variant="secundario"
              className="self-start"
              onClick={() => criar(centro, escolhido.id)}
            >
              Colocar no centro da tela
            </Button>
          ) : null}
          <VisualizadorPlanta
            planta={planta}
            marcadores={noMapa}
            onMarcadorClick={selecionarMarcador}
            onPlantaClick={aoClicarNaPlanta}
            onMarcadorArrastado={(chave, ponto) => {
              dispatch({ tipo: 'mover', chave, ponto });
              selecionarMarcador(chave);
            }}
            onCentroChange={setCentro}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {itemSelecionado ? (
            <MarcadorSelecionado
              plantaId={plantaId}
              item={itemSelecionado}
              onMoverParaCentro={() =>
                dispatch({
                  tipo: 'mover',
                  chave: itemSelecionado.chave,
                  ponto: centro,
                })
              }
              onDescartar={() => {
                dispatch({ tipo: 'descartar', chave: itemSelecionado.chave });
                setSelecionado(null);
              }}
              onRemovido={() => {
                dispatch({ tipo: 'descartar', chave: itemSelecionado.chave });
                setSelecionado(null);
              }}
            />
          ) : null}
          {aRevisar.length > 0 ? (
            <ARevisar marcadores={aRevisar} onEscolher={selecionarMarcador} />
          ) : null}
          <LotesSemMarcador
            plantaId={plantaId}
            posicionados={posicionados}
            escolhidoId={escolhido?.id ?? null}
            onEscolher={aoEscolherLote}
          />
        </div>
      </div>
      <ConfirmDialog
        title="Sair sem salvar?"
        description={`${total === 1 ? '1 alteração será perdida' : `${total} alterações serão perdidas`}.`}
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar editando"
        open={aviso.destino !== null}
        onOpenChange={(aberto) => {
          if (!aberto) {
            aviso.continuar();
          }
        }}
        onConfirm={aviso.sair}
      />
    </>
  );
}

export function EditorMarcadores() {
  const query = useQuery(editorDeMarcadoresOptions());

  if (query.isPending) {
    return (
      <>
        <PageHeader title="Editar marcadores" parents={PARENTS} />
        <Skeleton
          aria-label="Carregando o editor"
          className={ALTURA_VISUALIZADOR}
        />
      </>
    );
  }

  if (query.isError) {
    return (
      <>
        <PageHeader title="Editar marcadores" parents={PARENTS} />
        {query.error instanceof ApiError &&
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
        )}
      </>
    );
  }

  const planta = toPlantaVisualizada(query.data.planta);

  if (!planta) {
    return (
      <>
        <PageHeader title="Editar marcadores" parents={PARENTS} />
        <SemPlantaAtiva />
      </>
    );
  }

  return (
    <Editor
      plantaId={query.data.planta.id}
      planta={planta}
      marcadores={query.data.marcadores}
    />
  );
}

export function EditarMarcadoresLink() {
  return (
    <Link href="/mapa/editor" className={buttonClasses('secundario')}>
      Editar marcadores
    </Link>
  );
}
