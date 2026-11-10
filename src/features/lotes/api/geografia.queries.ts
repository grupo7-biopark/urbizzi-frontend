import { queryOptions } from '@tanstack/react-query';
import { listAreas } from './geografia.api';
export const geografiaKeys = {
  all: ['geografia'] as const,
  loteamento: (id: string) => ['geografia', 'loteamento', id] as const,
};
export function areasOptions(id: string, enabled: boolean) {
  return queryOptions({
    queryKey: geografiaKeys.loteamento(id),
    queryFn: () => listAreas(id),
    enabled: enabled && !!id,
  });
}
