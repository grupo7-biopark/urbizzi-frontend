import { queryOptions } from '@tanstack/react-query';
import { listAreasGeograficas } from './geografia.api';
export const geografiaKeys = {
  all: ['geografia'] as const,
  mapa: () => ['geografia', 'mapa'] as const,
};
export function areasGeograficasOptions() {
  return queryOptions({
    queryKey: geografiaKeys.mapa(),
    queryFn: listAreasGeograficas,
    refetchInterval: 10000,
  });
}
