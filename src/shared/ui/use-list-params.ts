'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toQueryString } from '@/shared/api/query-string';

/** Parâmetros que não são filtros: mudam a lista, mas não o que foi procurado. */
const NON_FILTER_PARAMS = new Set(['page', 'pageSize', 'orderBy', 'order']);

export function hasActiveFilters(params: Record<string, string>) {
  return Object.keys(params).some((name) => !NON_FILTER_PARAMS.has(name));
}

/**
 * Lê e altera o estado da listagem na URL, para ele sobreviver a recarregar e
 * poder ser compartilhado. Quem valida os valores é o schema da funcionalidade.
 */
export function useListParams() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = Object.fromEntries(searchParams);

  function getHref(changes: Record<string, unknown>) {
    const next: Record<string, unknown> = { ...params, ...changes };

    // Mudar um filtro ou a ordem altera o resultado: a página atual perde o sentido.
    if (!('page' in changes) || changes.page === 1) {
      delete next.page;
    }

    const query = toQueryString(next);

    return query ? `${pathname}?${query}` : pathname;
  }

  /** Substitui em vez de empilhar: cada tecla da busca não vira um "voltar". */
  function setParams(changes: Record<string, unknown>) {
    router.replace(getHref(changes), { scroll: false });
  }

  return { params, pathname, getHref, setParams };
}
