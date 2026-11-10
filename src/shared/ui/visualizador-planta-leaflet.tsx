// Os nomes com `_` são internos do Leaflet: é o que permite desenhar as formas.
// oxlint-disable no-underscore-dangle
'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Button } from './button';
import { cn } from './cn';
import {
  estaNaPlanta,
  latLngParaNormalizado,
  limitarAPlanta,
  limitesDaPlanta,
  normalizadoParaLatLng,
  type PontoNormalizado,
} from './coordenadas-planta';
import { getVerticesDaForma, type FormaMarcador } from './forma-marcador';
import {
  IconCentralizar,
  IconMais,
  IconMenos,
  IconSairTelaCheia,
  IconTelaCheia,
} from './icon';
import type {
  MarcadorPlanta,
  VisualizadorPlantaProps,
} from './visualizador-planta';

const RAIO_MARCADOR = 7;
const RAIO_DESTACADO = 12;
const ESPERA_DO_CLIQUE_MS = 50;
// Abaixo do zoom 0 a pirâmide não tem tile: o Leaflet reduz o do zoom 0.
const MENOR_ZOOM_DA_CAMADA = -5;
const TEMA_ESCURO = '(prefers-color-scheme: dark)';
// Fora do componente: um array novo a cada render redesenharia os marcadores.
const SEM_MARCADORES: MarcadorPlanta[] = [];

type Instancia = {
  mapa: L.Map;
  camada: L.LayerGroup;
  renderer: L.Canvas;
};

type OpcoesMarcador = L.CircleMarkerOptions & { forma?: FormaMarcador };

type MarcadorDesenhado = L.CircleMarker & {
  _point: L.Point;
  _radius: number;
  _empty: () => boolean;
  options: OpcoesMarcador;
};

type CanvasInterno = {
  _drawing: boolean;
  _ctx: CanvasRenderingContext2D;
  _fillStroke: (ctx: CanvasRenderingContext2D, layer: L.Layer) => void;
};

/**
 * O Leaflet só desenha círculos no canvas. `_updateCircle` é interno: confira este
 * trecho ao atualizar o Leaflet (a versão 1.9.4 foi a verificada). A área de clique
 * continua sendo o círculo, que é o que importa para o toque.
 */
const CanvasComFormas = (L.Canvas as unknown as typeof L.Class).extend({
  _updateCircle(this: CanvasInterno, marcador: MarcadorDesenhado) {
    if (!this._drawing || marcador._empty()) {
      return;
    }

    const ctx = this._ctx;
    const centro = marcador._point;
    const raio = Math.max(Math.round(marcador._radius), 1);
    const forma = marcador.options.forma ?? 'circulo';

    ctx.beginPath();

    if (forma === 'circulo') {
      ctx.arc(centro.x, centro.y, raio, 0, Math.PI * 2);
    } else {
      for (const { x, y } of getVerticesDaForma(forma, centro, raio)) {
        ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    this._fillStroke(ctx, marcador);
  },
}) as unknown as new (options: L.RendererOptions) => L.Canvas;

function lerToken(elemento: HTMLElement, token: string) {
  // O canvas precisa da cor resolvida no tema, não de light-dark(...).
  const amostra = document.createElement('span');
  amostra.style.color = `var(${token})`;
  elemento.append(amostra);
  const cor = getComputedStyle(amostra).color;
  amostra.remove();
  return cor;
}

function Controle({
  rotulo,
  children,
  ...props
}: ComponentProps<typeof Button> & { rotulo: string }) {
  return (
    <Button
      variant="secundario"
      size="icone"
      aria-label={rotulo}
      title={rotulo}
      className="bg-surface-panel"
      {...props}
    >
      {children}
    </Button>
  );
}

/** Carregado só no navegador, por `visualizador-planta.tsx`. */
export default function VisualizadorPlantaLeaflet({
  planta,
  marcadores = SEM_MARCADORES,
  onMarcadorClick,
  foco = null,
  onPlantaClick,
  onMarcadorArrastado,
  onCentroChange,
  className,
}: VisualizadorPlantaProps) {
  const { nome, larguraPx, alturaPx, maxZoom, tamanhoTile, tilesUrl } = planta;
  const raiz = useRef<HTMLDivElement>(null);
  const elementoMapa = useRef<HTMLDivElement>(null);
  const onClickRef = useRef(onMarcadorClick);
  const onPlantaClickRef = useRef(onPlantaClick);
  const onArrastadoRef = useRef(onMarcadorArrastado);
  const onCentroRef = useRef(onCentroChange);
  // O navegador dispara um clique ao soltar: não pode virar um marcador novo.
  const ignorarClique = useRef(false);
  const [zoom, setZoom] = useState<{ atual: number; minimo: number } | null>(
    null,
  );
  const [isTelaCheia, setIsTelaCheia] = useState(false);
  const [instancia, setInstancia] = useState<Instancia | null>(null);

  useEffect(() => {
    onClickRef.current = onMarcadorClick;
    onPlantaClickRef.current = onPlantaClick;
    onArrastadoRef.current = onMarcadorArrastado;
    onCentroRef.current = onCentroChange;
  }, [onMarcadorClick, onPlantaClick, onMarcadorArrastado, onCentroChange]);

  // O mapa do Leaflet vive fora do React: é criado uma vez por planta.
  useEffect(() => {
    if (!elementoMapa.current) {
      return undefined;
    }

    const dimensoes = { larguraPx, alturaPx, maxZoom };
    const limites = L.latLngBounds(limitesDaPlanta(dimensoes));
    const mapa = L.map(elementoMapa.current, {
      crs: L.CRS.Simple,
      maxZoom,
      minZoom: MENOR_ZOOM_DA_CAMADA,
      maxBounds: limites.pad(0.1),
      maxBoundsViscosity: 1,
      zoomControl: false,
      attributionControl: false,
    });
    const atualizarZoom = () =>
      setZoom({ atual: mapa.getZoom(), minimo: mapa.getMinZoom() });
    const ajustarZoomMinimo = () => {
      // Até a planta inteira caber na tela: reduzir mais só desperdiça espaço.
      mapa.setMinZoom(Math.min(mapa.getBoundsZoom(limites), maxZoom));
      atualizarZoom();
    };

    // `bounds` e `noWrap` evitam pedir tiles fora da imagem, que seriam 404.
    L.tileLayer(tilesUrl, {
      tileSize: tamanhoTile,
      bounds: limites,
      noWrap: true,
      minZoom: MENOR_ZOOM_DA_CAMADA,
      minNativeZoom: 0,
      maxNativeZoom: maxZoom,
      maxZoom,
    }).addTo(mapa);

    mapa.fitBounds(limites, { animate: false });
    ajustarZoomMinimo();
    mapa.on('zoomend', atualizarZoom);

    // Canvas, para milhares de marcadores não virarem milhares de elementos.
    setInstancia({
      mapa,
      camada: L.layerGroup().addTo(mapa),
      renderer: new CanvasComFormas({ padding: 0.5 }),
    });

    const observador = new ResizeObserver(() => {
      mapa.invalidateSize();
      ajustarZoomMinimo();
    });
    observador.observe(elementoMapa.current);

    return () => {
      observador.disconnect();
      mapa.remove();
      setInstancia(null);
    };
  }, [larguraPx, alturaPx, maxZoom, tamanhoTile, tilesUrl]);

  useEffect(() => {
    if (instancia && foco) {
      instancia.mapa.setView(
        normalizadoParaLatLng(foco, { larguraPx, alturaPx, maxZoom }),
        maxZoom,
      );
    }
  }, [instancia, foco, larguraPx, alturaPx, maxZoom]);

  useEffect(() => {
    if (!instancia) {
      return undefined;
    }

    const { mapa } = instancia;
    const dimensoes = { larguraPx, alturaPx, maxZoom };
    const aoClicar = ({ latlng }: L.LeafletMouseEvent) => {
      const ponto = latLngParaNormalizado([latlng.lat, latlng.lng], dimensoes);

      // A planta tem uma folga em volta, e fora da imagem não há o que marcar.
      if (!ignorarClique.current && estaNaPlanta(ponto)) {
        onPlantaClickRef.current?.(ponto);
      }
    };
    const aoMoverMapa = () => {
      const { lat, lng } = mapa.getCenter();

      onCentroRef.current?.(
        limitarAPlanta(latLngParaNormalizado([lat, lng], dimensoes)),
      );
    };

    mapa.on('click', aoClicar);
    mapa.on('moveend', aoMoverMapa);
    aoMoverMapa();

    return () => {
      mapa.off('click', aoClicar);
      mapa.off('moveend', aoMoverMapa);
    };
  }, [instancia, larguraPx, alturaPx, maxZoom]);

  // O canvas guarda a cor resolvida: repinta quando o tema muda, sem recriar nada.
  useEffect(() => {
    const elemento = raiz.current;

    if (!instancia || !elemento) {
      return undefined;
    }

    const { mapa, camada, renderer } = instancia;
    const dimensoes = { larguraPx, alturaPx, maxZoom };

    // O `L.CircleMarker` não é arrastável, e o Leaflet só arrasta o `L.Marker`, com
    // um elemento por marcador. Só com o mouse: o toque usa "Mover para o centro".
    function iniciarArraste(circulo: L.CircleMarker, id: string) {
      let ponto: PontoNormalizado | null = null;
      const aoMover = ({ latlng }: L.LeafletMouseEvent) => {
        ponto = limitarAPlanta(
          latLngParaNormalizado([latlng.lat, latlng.lng], dimensoes),
        );
        circulo.setLatLng(normalizadoParaLatLng(ponto, dimensoes));
      };
      const aoSoltar = (evento: MouseEvent) => {
        mapa.off('mousemove', aoMover);
        document.removeEventListener('mouseup', aoSoltar);
        mapa.dragging.enable();

        // A posição final é onde o botão foi solto: o último `mousemove` pode se perder.
        if (ponto) {
          const { lat, lng } = mapa.mouseEventToLatLng(evento);

          ponto = limitarAPlanta(latLngParaNormalizado([lat, lng], dimensoes));
        }

        if (ponto) {
          ignorarClique.current = true;
          setTimeout(() => {
            ignorarClique.current = false;
          }, ESPERA_DO_CLIQUE_MS);
          onArrastadoRef.current?.(id, ponto);
        }
      };

      mapa.dragging.disable();
      mapa.on('mousemove', aoMover);
      document.addEventListener('mouseup', aoSoltar);
    }

    const desenhados = marcadores.map((marcador) => {
      const circulo = L.circleMarker(
        normalizadoParaLatLng(marcador, dimensoes),
        {
          renderer,
          radius: marcador.destacado ? RAIO_DESTACADO : RAIO_MARCADOR,
          weight: 2,
          fillOpacity: 1,
          forma: marcador.forma,
          // Sem isto, o clique no marcador também seria um clique na planta.
          bubblingMouseEvents: false,
        } as OpcoesMarcador,
      );

      circulo
        .on('click', () => {
          if (!ignorarClique.current) {
            onClickRef.current?.(marcador.id);
          }
        })
        .on('mousedown', () => {
          if (onArrastadoRef.current) {
            iniciarArraste(circulo, marcador.id);
          }
        })
        .addTo(camada);

      return { token: marcador.cor, circulo };
    });
    const pintar = () => {
      const cores = new Map<string, string>();
      const corDoToken = (token: string) => {
        const cor = cores.get(token) ?? lerToken(elemento, token);
        cores.set(token, cor);
        return cor;
      };
      const contorno = corDoToken('--surface');

      for (const { token, circulo } of desenhados) {
        circulo.setStyle({
          color: contorno,
          fillColor: corDoToken(token),
        });
      }
    };
    const tema = window.matchMedia(TEMA_ESCURO);

    pintar();
    tema.addEventListener('change', pintar);

    return () => {
      tema.removeEventListener('change', pintar);
      camada.clearLayers();
    };
  }, [instancia, marcadores, larguraPx, alturaPx, maxZoom]);

  useEffect(() => {
    const aoMudar = () =>
      setIsTelaCheia(document.fullscreenElement === raiz.current);

    document.addEventListener('fullscreenchange', aoMudar);

    return () => document.removeEventListener('fullscreenchange', aoMudar);
  }, []);

  function alternarTelaCheia() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void raiz.current?.requestFullscreen();
    }
  }

  function centralizar() {
    instancia?.mapa.fitBounds(
      limitesDaPlanta({ larguraPx, alturaPx, maxZoom }),
    );
  }

  return (
    <div
      ref={raiz}
      className={cn(
        'relative overflow-hidden border border-border bg-surface-panel',
        className,
      )}
    >
      {/* O Leaflet deixa o mapa focável: as setas movem, e + e - mudam o zoom. */}
      {/* `!`: o `.leaflet-container` fica fora das camadas do Tailwind e venceria. */}
      {/* Branco nos dois temas: é a cor que completa os tiles das bordas da planta. */}
      <div
        ref={elementoMapa}
        role="application"
        aria-label={`Planta ${nome}. Use as setas para mover e as teclas mais e menos para o zoom.`}
        className="absolute inset-0 isolate !bg-branco"
      />
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <Controle
          rotulo="Aproximar"
          disabled={zoom !== null && zoom.atual >= maxZoom}
          onClick={() => instancia?.mapa.zoomIn()}
        >
          <IconMais className="size-4" />
        </Controle>
        <Controle
          rotulo="Afastar"
          disabled={zoom !== null && zoom.atual <= zoom.minimo}
          onClick={() => instancia?.mapa.zoomOut()}
        >
          <IconMenos className="size-4" />
        </Controle>
        <Controle rotulo="Centralizar a planta" onClick={centralizar}>
          <IconCentralizar className="size-4" />
        </Controle>
        {/* O Safari do iPhone não tem tela cheia para elementos. */}
        {document.fullscreenEnabled ? (
          <Controle
            rotulo={isTelaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
            onClick={alternarTelaCheia}
          >
            {isTelaCheia ? (
              <IconSairTelaCheia className="size-4" />
            ) : (
              <IconTelaCheia className="size-4" />
            )}
          </Controle>
        ) : null}
      </div>
    </div>
  );
}
