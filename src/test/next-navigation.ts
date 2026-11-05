import { useSyncExternalStore } from 'react';

/**
 * Substitui `next/navigation` nos testes, usando a URL do jsdom, para a tela reagir
 * à navegação como no navegador:
 *
 *   vi.mock('next/navigation', () => import('@/test/next-navigation'));
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useLocationValue() {
  return useSyncExternalStore(subscribe, () => window.location.href);
}

export function setTestUrl(url: string) {
  window.history.replaceState(null, '', url);
  listeners.forEach((listener) => listener());
}

export function usePathname() {
  useLocationValue();
  return window.location.pathname;
}

export function useSearchParams() {
  useLocationValue();
  return new URLSearchParams(window.location.search);
}

const router = { replace: setTestUrl, push: setTestUrl };

export function useRouter() {
  return router;
}
