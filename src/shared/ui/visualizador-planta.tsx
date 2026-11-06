'use client';

import dynamic from 'next/dynamic';
import { cn } from './cn';
import type { DimensoesPlanta, PontoNormalizado } from './coordenadas-planta';
import type { FormaMarcador } from './forma-marcador';
import { Skeleton } from './skeleton';

export type PlantaVisualizada = DimensoesPlanta & {
  nome: string;
  tamanhoTile: number;
  /** Modelo de URL dos tiles, com `{z}`, `{x}` e `{y}`. */
  tilesUrl: string;
};

export type MarcadorPlanta = PontoNormalizado & {
  id: string;
  /** Nome do token de cor, como `--status-disponivel`: acompanha o tema. */
  cor: string;
  forma?: FormaMarcador;
  /** Maior que os demais, para ser encontrado depois de uma busca. */
  destacado?: boolean;
};

export type VisualizadorPlantaProps = {
  planta: PlantaVisualizada;
  marcadores?: MarcadorPlanta[];
  onMarcadorClick?: (id: string) => void;
  /** Ao mudar, aproxima até o zoom máximo neste ponto. */
  foco?: PontoNormalizado | null;
  className?: string;
};

export const ALTURA_VISUALIZADOR = 'h-[70dvh] min-h-80';

// O Leaflet depende de `window`: só carrega no navegador.
const VisualizadorLeaflet = dynamic(
  () => import('./visualizador-planta-leaflet'),
  {
    ssr: false,
    loading: () => (
      <Skeleton
        aria-label="Carregando o visualizador"
        className={ALTURA_VISUALIZADOR}
      />
    ),
  },
);

/**
 * Mostra uma planta em tiles, com zoom e arraste. Não busca dados nem conhece
 * status: serve ao mapa interno, ao editor de marcadores e à página pública.
 */
export function VisualizadorPlanta({
  className,
  ...props
}: VisualizadorPlantaProps) {
  return (
    <VisualizadorLeaflet
      {...props}
      className={cn(ALTURA_VISUALIZADOR, className)}
    />
  );
}
