import { useEffect, useRef, useState } from 'react';
import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { enviarPlanta, type EnviarPlanta } from '../api/plantas.api';
import { plantasKeys } from '../api/plantas.queries';

function avisarAoFechar(event: BeforeUnloadEvent) {
  event.preventDefault();
}

/** Envio com progresso e cancelamento. `progresso` é `null` fora de um envio. */
export function useEnviarPlanta() {
  const [progresso, setProgresso] = useState<number | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const isEnviando = progresso !== null;

  // Sair da tela interrompe o envio, para ele não seguir sem ninguém acompanhando.
  useEffect(() => () => abortController.current?.abort(), []);

  // Fechar a aba perderia um envio de dezenas de MB sem nenhum aviso.
  useEffect(() => {
    if (!isEnviando) {
      return undefined;
    }

    window.addEventListener('beforeunload', avisarAoFechar);

    return () => window.removeEventListener('beforeunload', avisarAoFechar);
  }, [isEnviando]);

  const { mutateAsync } = useApiMutation({
    mutationFn: async (values: EnviarPlanta) => {
      const controller = new AbortController();

      abortController.current = controller;
      setProgresso(0);

      try {
        return await enviarPlanta(values, {
          onProgress: setProgresso,
          signal: controller.signal,
        });
      } finally {
        abortController.current = null;
        setProgresso(null);
      }
    },
    invalidates: [plantasKeys.lists()],
    successMessage: 'Planta enviada. Acompanhe o processamento na lista.',
    errorToast: false, // o Form mostra o erro nele mesmo
  });

  return {
    enviar: mutateAsync,
    progresso,
    cancelar: () => abortController.current?.abort(),
  };
}
