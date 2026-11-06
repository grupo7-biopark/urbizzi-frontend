'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Button } from './button';
import { cn } from './cn';
import { limitesDaPlanta, normalizadoParaLatLng } from './coordenadas-planta';
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

function lerToken(elemento: HTMLElement, token: string) {
  return getComputedStyle(elemento).getPropertyValue(token).trim() || token;
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
  className,
}: VisualizadorPlantaProps) {
  const { nome, larguraPx, alturaPx, maxZoom, tamanhoTile, tilesUrl } = planta;
  const raiz = useRef<HTMLDivElement>(null);
  const elementoMapa = useRef<HTMLDivElement>(null);
  const onClickRef = useRef(onMarcadorClick);
  const [zoom, setZoom] = useState<{ atual: number; minimo: number } | null>(
    null,
  );
  const [isTelaCheia, setIsTelaCheia] = useState(false);
  const [instancia, setInstancia] = useState<Instancia | null>(null);

  useEffect(() => {
    onClickRef.current = onMarcadorClick;
  }, [onMarcadorClick]);

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
      renderer: L.canvas({ padding: 0.5 }),
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

  // O canvas guarda a cor resolvida: repinta quando o tema muda, sem recriar nada.
  useEffect(() => {
    const elemento = raiz.current;

    if (!instancia || !elemento) {
      return undefined;
    }

    const { camada, renderer } = instancia;
    const desenhados = marcadores.map((marcador) => ({
      token: marcador.cor,
      circulo: L.circleMarker(
        normalizadoParaLatLng(marcador, { larguraPx, alturaPx, maxZoom }),
        { renderer, radius: RAIO_MARCADOR, weight: 2, fillOpacity: 1 },
      )
        .on('click', () => onClickRef.current?.(marcador.id))
        .addTo(camada),
    }));
    const pintar = () => {
      const contorno = lerToken(elemento, '--surface');

      for (const { token, circulo } of desenhados) {
        circulo.setStyle({
          color: contorno,
          fillColor: lerToken(elemento, token),
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
