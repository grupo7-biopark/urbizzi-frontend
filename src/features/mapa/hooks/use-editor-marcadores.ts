import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useReducer } from 'react';
import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { useToast } from '@/shared/ui/toast';
import {
  createMarcadores,
  deleteMarcador,
  moverMarcador,
  revisarMarcador,
} from '../api/mapa.api';
import { mapaKeys } from '../api/mapa.queries';
import {
  alteracoesReducer,
  SEM_ALTERACOES,
  type Alteracoes,
} from './alteracoes-marcadores';

/** O máximo da API em uma requisição. */
const MARCADORES_POR_ENVIO = 500;

export function useAlteracoesMarcadores(plantaId: string) {
  const [alteracoes, dispatch] = useReducer(alteracoesReducer, SEM_ALTERACOES);
  const queryClient = useQueryClient();
  const toast = useToast();

  // A API não salva movimentos em lote: uma falha no meio deixa pendente só o que
  // faltou, e a lista é atualizada mesmo assim, porque parte já foi gravada.
  const salvar = useMutation({
    mutationFn: async ({ novos, movidos }: Alteracoes) => {
      const lotes = novos.flatMap(({ loteId, x, y }) =>
        loteId ? [{ loteId, x, y }] : [],
      );

      for (let i = 0; i < lotes.length; i += MARCADORES_POR_ENVIO) {
        await createMarcadores(
          plantaId,
          lotes.slice(i, i + MARCADORES_POR_ENVIO),
        );
      }
      dispatch({ tipo: 'novosSalvos' });

      for (const [id, ponto] of Object.entries(movidos)) {
        await moverMarcador(plantaId, id, ponto);
        dispatch({ tipo: 'movidoSalvo', id });
      }
    },
    onSuccess: () => toast({ title: 'Marcadores salvos', variant: 'sucesso' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: mapaKeys.all }),
  });

  return { alteracoes, dispatch, salvar };
}

export function useRemoverMarcador(plantaId: string) {
  return useApiMutation({
    mutationFn: (id: string) => deleteMarcador(plantaId, id),
    invalidates: [mapaKeys.all],
    successMessage: 'Marcador removido',
    errorToast: false, // o `ConfirmDialog` mostra o erro nele mesmo
  });
}

export function useRevisarMarcador(plantaId: string) {
  return useApiMutation({
    mutationFn: (id: string) => revisarMarcador(plantaId, id),
    invalidates: [mapaKeys.all],
    successMessage: 'Marcador revisado',
  });
}
