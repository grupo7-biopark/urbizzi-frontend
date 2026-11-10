import { queryOptions } from '@tanstack/react-query';
import { getArea, listAreas } from './geografia.api';
export const geografiaKeys = {
  all: ['geografia'] as const,
  area: (id?: string) => ['geografia', 'area', id] as const,
  loteamento: (id: string) => ['geografia', 'loteamento', id] as const,
};
export function areaOptions(id: string | undefined, enabled: boolean) {
  return queryOptions({
    queryKey: geografiaKeys.area(id),
    queryFn: () => getArea(id!),
    enabled: enabled && !!id,
  });
}
export function areasOptions(id: string, enabled: boolean) {
  return queryOptions({
    queryKey: geografiaKeys.loteamento(id),
    queryFn: () => listAreas(id),
    enabled: enabled && !!id,
  });
}
