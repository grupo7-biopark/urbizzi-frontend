'use client';
import { useState } from 'react';
import type { components } from '@/shared/api/schema';
import { StatusLoteBadge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { formatArea, formatMoeda } from '@/shared/ui/masks';
import { Panel } from '@/shared/ui/panel';
import {
  VisualizadorPlanta,
  type MarcadorPlanta,
} from '@/shared/ui/visualizador-planta';
const STATUS: Record<
  components['schemas']['LotePublicoDto']['status'],
  Pick<MarcadorPlanta, 'cor' | 'forma'>
> = {
  DISPONIVEL: { cor: '--status-disponivel', forma: 'circulo' },
  RESERVADO: { cor: '--status-reservado', forma: 'triangulo' },
  VENDIDO: { cor: '--status-vendido', forma: 'quadrado' },
  BLOQUEADO: { cor: '--status-bloqueado', forma: 'losango' },
};
/** Destino básico da FE-32. Interações avançadas do mapa ficam para a FE-33. */
export function MapaPublico({
  dados,
}: {
  dados: components['schemas']['MapaPublicoDto'];
}) {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const { planta, marcadores } = dados;
  const foco = marcadores.data.find((m) => m.id === selecionado);
  return (
    <>
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
      <Panel title="Atendimento">
        <p className="whitespace-pre-wrap wrap-anywhere">
          {dados.contatoComercial}
        </p>
      </Panel>
    </>
  );
}
