'use client';
import dynamic from 'next/dynamic';
export interface ContornoMapa {
  id: string;
  vertices: number[][];
  label: string;
  color?: string;
  preenchido?: boolean;
  rotuloFixo?: boolean;
}
export interface MapaGeograficoProps {
  contornos: ContornoMapa[];
  vertices?: number[][] | null;
  desenhando?: boolean;
  onChange?: (vertices: number[][]) => void;
  onSelect?: (id: string) => void;
  destino?: { latitude: number; longitude: number };
  enquadramento?: string;
}
export const MapaGeografico = dynamic(
  () => import('./mapa-geografico-leaflet'),
  {
    ssr: false,
    loading: () => (
      <output className="h-[480px] animate-pulse bg-surface-hover">
        Carregando mapa…
      </output>
    ),
  },
);
