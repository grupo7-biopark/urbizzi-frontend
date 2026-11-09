import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { createLink, desativarLink } from '../api/links-publicos.api';
import { linksKeys } from '../api/links-publicos.queries';
const invalidates = [linksKeys.all, ['historico']];
export function useCreateLink() {
  return useApiMutation({
    mutationFn: createLink,
    invalidates,
    successMessage: 'Link público criado.',
    errorToast: false,
  });
}
export function useDesativarLink() {
  return useApiMutation({
    mutationFn: desativarLink,
    invalidates,
    successMessage: 'Link público desativado.',
    errorToast: false,
  });
}
