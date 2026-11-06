import { queryOptions } from '@tanstack/react-query';
import { getPlantaAtiva } from './mapa.api';

export const mapaKeys = {
  all: ['mapa'] as const,
  plantaAtiva: () => [...mapaKeys.all, 'planta-ativa'] as const,
};

export function plantaAtivaOptions() {
  return queryOptions({
    queryKey: mapaKeys.plantaAtiva(),
    queryFn: getPlantaAtiva,
  });
}
