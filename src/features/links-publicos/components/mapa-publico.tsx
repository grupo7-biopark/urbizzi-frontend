'use client';
import { useState } from 'react';
import type { components } from '@/shared/api/schema';
import { StatusLoteBadge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Drawer } from '@/shared/ui/drawer';
import { IndicadorConexao } from '@/shared/ui/indicador-conexao';
import { formatArea, formatMoeda } from '@/shared/ui/masks';
import { Panel } from '@/shared/ui/panel';
import {
  VisualizadorPlanta,
  type MarcadorPlanta,
} from '@/shared/ui/visualizador-planta';
import { useEventosMapaPublico } from '../hooks/use-eventos-mapa-publico';
import { ContatoMapaPublico } from './contato-mapa-publico';
const STATUS: Record<
  components['schemas']['LotePublicoDto']['status'],
  Pick<MarcadorPlanta, 'cor' | 'forma'>
> = {
  DISPONIVEL: { cor: '--status-disponivel', forma: 'circulo' },
  RESERVADO: { cor: '--status-reservado', forma: 'triangulo' },
  VENDIDO: { cor: '--status-vendido', forma: 'quadrado' },
  BLOQUEADO: { cor: '--status-bloqueado', forma: 'losango' },
};
const LEGENDA = [
  {
    texto: 'Lotes disponíveis',
    cor: 'bg-status-disponivel',
    forma: 'rounded-full',
  },
  {
    texto: 'Lotes reservados',
    cor: 'bg-status-reservado',
    forma: '[clip-path:polygon(50%_0%,100%_100%,0%_100%)]',
  },
  { texto: 'Lotes vendidos', cor: 'bg-status-vendido', forma: '' },
  { texto: 'Lotes bloqueados', cor: 'bg-status-bloqueado', forma: 'rotate-45' },
] as const;
export function MapaPublico({
  dados,
  token,
}: {
  dados: components['schemas']['MapaPublicoDto'];
  token: string;
}) {
  const { dados: dadosAoVivo, estado } = useEventosMapaPublico(token, dados);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const { planta, marcadores } = dadosAoVivo;
  const foco = marcadores.data.find((m) => m.id === selecionado);
  return (
    <>
      <div className="flex justify-end">
        <IndicadorConexao estado={estado} />
      </div>
      <ul
        aria-label="Legenda do mapa público"
        className="flex flex-wrap gap-x-5 gap-y-2 text-small"
      >
        {LEGENDA.map(({ texto, cor, forma }) => (
          <li key={texto} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`size-3 shrink-0 ${cor} ${forma}`}
            />
            {texto}
          </li>
        ))}
      </ul>
      {planta.larguraPx !== null &&
      planta.alturaPx !== null &&
      planta.maxZoom !== null &&
      planta.tamanhoTile !== null ? (
        <VisualizadorPlanta
          planta={{
            nome: planta.nome,
            larguraPx: planta.larguraPx,
            alturaPx: planta.alturaPx,
            maxZoom: planta.maxZoom,
            tamanhoTile: planta.tamanhoTile,
            tilesUrl: `/api/publico/plantas/${encodeURIComponent(planta.id)}/tiles/{z}/{x}/{y}.webp`,
          }}
          marcadores={marcadores.data.map((m) => ({
            id: m.id,
            x: m.x,
            y: m.y,
            ...STATUS[m.status],
            destacado: m.id === selecionado,
          }))}
          onMarcadorClick={setSelecionado}
          foco={foco ?? null}
        />
      ) : (
        <p className="text-small text-ink-muted">
          A visualização da planta está indisponível.
        </p>
      )}
      <Panel title="Lotes nesta página">
        {marcadores.data.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {marcadores.data.map((m) => (
              <li key={m.id} className="border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold">Lote {m.numero}</h2>
                  <StatusLoteBadge status={m.status} />
                </div>
                <p className="mt-2 text-small text-ink-muted">
                  {m.loteamento} · Quadra {m.quadra}
                </p>
                <p className="mt-2">
                  {formatArea(m.areaM2)}
                  {m.valor ? ` · ${formatMoeda(m.valor)}` : ''}
                </p>
                <Button
                  variant="fantasma"
                  size="compacto"
                  onClick={() => setSelecionado(m.id)}
                >
                  Localizar na planta
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-ink-muted">
            Nenhum lote disponível para consulta nesta página.
          </p>
        )}
      </Panel>
      <Drawer
        side="bottom"
        title={foco ? `Lote ${foco.numero}` : 'Lote'}
        open={Boolean(foco)}
        onOpenChange={(aberto) => {
          if (!aberto) setSelecionado(null);
        }}
      >
        {foco ? (
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt>Loteamento</dt>
              <dd>{foco.loteamento}</dd>
            </div>
            <div>
              <dt>Quadra</dt>
              <dd>{foco.quadra}</dd>
            </div>
            <div>
              <dt>Área</dt>
              <dd>{formatArea(foco.areaM2)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusLoteBadge status={foco.status} />
              </dd>
            </div>
            {foco.valor != null ? (
              <div>
                <dt>Valor</dt>
                <dd>{formatMoeda(foco.valor)}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </Drawer>
      <ContatoMapaPublico contato={dadosAoVivo.contatoComercial} />
    </>
  );
}
