import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { listEscopos, listLinks } from './links-publicos.api';
export const linksKeys = { all: ['links-publicos'] as const };
export function linksListOptions(query: { page: number; pageSize: number }) {
  return queryOptions({
    queryKey: [...linksKeys.all, 'list', query],
    queryFn: () => listLinks(query),
    placeholderData: keepPreviousData,
  });
}
export function escoposOptions() {
  return queryOptions({
    queryKey: [...linksKeys.all, 'escopos'],
    queryFn: listEscopos,
  });
}
