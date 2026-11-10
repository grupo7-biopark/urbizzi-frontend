'use client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { Button } from './button';
import type { MapaGeograficoProps } from './mapa-geografico';
import { cabeRotuloNaArea } from './rotulo-area';
import {
  MAX_VERTICES_GEOGRAFICOS,
  type Coordenada,
} from './coordenadas-geograficas';

export default function MapaGeograficoLeaflet(props: MapaGeograficoProps) {
  const container = useRef<HTMLDivElement>(null);
  const instancia = useRef<{ map: L.Map; layers: L.LayerGroup } | null>(null);
  const latest = useRef(props);
  const fitted = useRef(false);
  const lastFrame = useRef(props.enquadramento);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    latest.current = props;
  });
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, {
      center: [-24.7246, -53.741],
      zoom: 15,
      doubleClickZoom: false,
    });
    const tiles = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 22,
        maxNativeZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    ).addTo(map);
    tiles.on('tileerror', () => setTileError(true));
    const layers = L.layerGroup().addTo(map);
    instancia.current = { map, layers };
    map.on('click', (e: L.LeafletMouseEvent) => {
      const p = latest.current;
      if (
        p.desenhando &&
        p.onChange &&
        (p.vertices?.length ?? 0) < MAX_VERTICES_GEOGRAFICOS
      )
        p.onChange([...(p.vertices ?? []), [e.latlng.lat, e.latlng.lng]]);
    });
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      map.remove();
      instancia.current = null;
      fitted.current = false;
    };
  }, []);
  useEffect(() => {
    if (lastFrame.current !== props.enquadramento) {
      fitted.current = false;
      lastFrame.current = props.enquadramento;
    }
    const instance = instancia.current;
    if (!instance) return;
    const { map, layers } = instance;
    layers.clearLayers();
    const rotulos: {
      poly: L.Polygon;
      label: HTMLElement;
      vertices: Coordenada[];
      texto: string;
    }[] = [];
    for (const c of props.contornos) {
      const poly = L.polygon(c.vertices as Coordenada[], {
        color: c.color ?? 'var(--accent)',
        fillOpacity: c.preenchido === false ? 0.03 : 0.4,
        weight: c.preenchido === false ? 3 : 2,
        dashArray: c.preenchido === false ? '8 5' : undefined,
        interactive: !props.desenhando,
      }).addTo(layers);
      const label = document.createElement('span');
      label.textContent = c.label;
      if (c.rotuloFixo)
        rotulos.push({
          poly,
          label,
          vertices: c.vertices as Coordenada[],
          texto: c.label,
        });
      else poly.bindTooltip(label, { sticky: true });
      poly.on('click', () => latest.current.onSelect?.(c.id));
    }
    const vertices = (props.vertices ?? []) as Coordenada[];
    if (vertices.length >= 3)
      L.polygon(vertices, {
        color: 'var(--accent)',
        fillOpacity: 0.25,
        interactive: false,
      }).addTo(layers);
    else if (vertices.length)
      L.polyline(vertices, {
        color: 'var(--accent)',
        interactive: false,
      }).addTo(layers);
    if (props.onChange)
      vertices.forEach((p, i) => {
        const marker = L.marker(p, {
          draggable: true,
          icon: L.divIcon({
            className: '',
            html: '<span style="display:block;width:16px;height:16px;border:3px solid var(--ink);background:var(--accent)"></span>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
          title: `Vértice ${i + 1}`,
          alt: `Vértice ${i + 1}`,
        }).addTo(layers);
        marker.on('dragend', () => {
          const current = latest.current.vertices ?? [];
          const ll = marker.getLatLng();
          latest.current.onChange?.(
            current.map((v, index) => (index === i ? [ll.lat, ll.lng] : v)),
          );
        });
      });
    if (
      props.onChange &&
      !props.desenhando &&
      vertices.length >= 3 &&
      vertices.length < MAX_VERTICES_GEOGRAFICOS
    ) {
      vertices.forEach((p, i) => {
        const next = vertices[(i + 1) % vertices.length];
        const midpoint: Coordenada = [
          (p[0] + next[0]) / 2,
          (p[1] + next[1]) / 2,
        ];
        const label = `Adicionar ponto entre ${i + 1} e ${((i + 1) % vertices.length) + 1}`;
        const insertMarker = L.marker(midpoint, {
          title: label,
          alt: label,
          bubblingMouseEvents: false,
          icon: L.divIcon({
            className: '',
            html: '<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border:2px solid var(--ink);background:var(--surface);color:var(--ink);font-size:18px;font-weight:bold;line-height:1">+</span>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        })
          .addTo(layers)
          .on('click', () => {
            const current = latest.current.vertices;
            if (!current || current.length >= MAX_VERTICES_GEOGRAFICOS) return;
            latest.current.onChange?.([
              ...current.slice(0, i + 1),
              midpoint,
              ...current.slice(i + 1),
            ]);
          });
        insertMarker.getElement()?.setAttribute('aria-label', label);
      });
    }
    const bounds = [
      ...props.contornos.flatMap((c) => c.vertices),
      ...vertices,
    ] as Coordenada[];
    if (!fitted.current && !props.desenhando && bounds.length >= 3) {
      map.stop().fitBounds(L.latLngBounds(bounds), {
        padding: [35, 35],
        maxZoom: 18,
        animate: false,
      });
      fitted.current = true;
    }
    const atualizarRotulos = () => {
      for (const r of rotulos) {
        const points = r.vertices.map((v) => map.latLngToLayerPoint(v));
        const largura =
          Math.max(...points.map((p) => p.x)) -
          Math.min(...points.map((p) => p.x));
        const altura =
          Math.max(...points.map((p) => p.y)) -
          Math.min(...points.map((p) => p.y));
        if (cabeRotuloNaArea(map.getZoom(), largura, altura, r.texto)) {
          if (!r.poly.getTooltip())
            r.poly.bindTooltip(r.label, {
              permanent: true,
              direction: 'center',
            });
        } else r.poly.unbindTooltip();
      }
    };
    atualizarRotulos();
    map.on('zoomend resize', atualizarRotulos);
    return () => {
      map.off('zoomend resize', atualizarRotulos);
    };
  }, [
    props.contornos,
    props.vertices,
    props.onChange,
    props.desenhando,
    props.enquadramento,
  ]);
  useEffect(() => {
    if (props.destino)
      instancia.current?.map
        .stop()
        .setView([props.destino.latitude, props.destino.longitude], 17, {
          animate: false,
        });
  }, [props.destino]);
  return (
    <div className="space-y-2">
      <section
        ref={container}
        aria-label="Mapa geográfico interativo"
        className="relative isolate z-0 h-[480px] min-w-0 border border-border"
      />
      {tileError && (
        <output className="text-small text-ink-muted">
          O mapa base não carregou completamente. Confira sua conexão; as
          demarcações continuam disponíveis.
        </output>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-ink-muted">
          Mapa de ruas · OpenStreetMap
        </p>
        <Button
          variant="fantasma"
          size="compacto"
          onClick={() => {
            const all = [
              ...props.contornos.flatMap((c) => c.vertices),
              ...(props.vertices ?? []),
            ] as Coordenada[];
            if (all.length)
              instancia.current?.map.stop().fitBounds(L.latLngBounds(all), {
                padding: [35, 35],
                maxZoom: 18,
                animate: false,
              });
          }}
        >
          Enquadrar áreas
        </Button>
      </div>
    </div>
  );
}
