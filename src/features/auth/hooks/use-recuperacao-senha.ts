import { useMutation } from '@tanstack/react-query';
import { redefinirSenha, solicitarRecuperacao } from '../api/auth.api';

/** Sem invalidação nem Toast: as telas são públicas, e o resultado aparece nelas. */
export function useSolicitarRecuperacao() {
  return useMutation({ mutationFn: solicitarRecuperacao });
}

export function useRedefinirSenha() {
  return useMutation({ mutationFn: redefinirSenha });
}
