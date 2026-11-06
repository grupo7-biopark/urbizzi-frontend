import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Com alterações pendentes, avisa ao fechar a página e ao seguir um link interno.
 * O App Router não tem evento de navegação, por isso os cliques são interceptados.
 * O botão "voltar" do navegador não passa por aqui.
 */
export function useAvisoAoSair(temAlteracoes: boolean) {
  const router = useRouter();
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    if (!temAlteracoes) {
      return undefined;
    }

    function avisarAoFechar(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    function aoClicar(event: MouseEvent) {
      const link =
        event.target instanceof Element ? event.target.closest('a') : null;
      const href = link?.getAttribute('href');

      // Com Ctrl ou em outra aba, a tela atual continua aberta.
      if (
        href?.startsWith('/') &&
        !link?.hasAttribute('download') &&
        link?.target !== '_blank' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        setDestino(href);
      }
    }

    window.addEventListener('beforeunload', avisarAoFechar);
    document.addEventListener('click', aoClicar, true);

    return () => {
      window.removeEventListener('beforeunload', avisarAoFechar);
      document.removeEventListener('click', aoClicar, true);
    };
  }, [temAlteracoes]);

  return {
    destino,
    continuar: () => setDestino(null),
    sair: () => {
      if (destino) {
        router.push(destino);
      }
    },
  };
}
