import { queryOptions } from '@tanstack/react-query';
import { getPrazos } from './configuracoes.api';

export const configuracoesKeys = {
  all: ['configuracoes'] as const,
  prazos: () => [...configuracoesKeys.all, 'prazos'] as const,
};

export function prazosOptions() {
  return queryOptions({
    queryKey: configuracoesKeys.prazos(),
    queryFn: getPrazos,
  });
}
