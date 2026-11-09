import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';

export type AcaoStatusLote = 'bloquear' | 'desbloquear' | 'vender';

export function alterarStatusLote({
  id,
  acao,
  motivo,
}: {
  id: string;
  acao: AcaoStatusLote;
  motivo: string;
}) {
  const params = { path: { id } };
  switch (acao) {
    case 'bloquear':
      return unwrap(
        api.POST('/v1/lotes/{id}/bloquear', { params, body: { motivo } }),
      );
    case 'desbloquear':
      return unwrap(api.POST('/v1/lotes/{id}/desbloquear', { params }));
    case 'vender':
      return unwrap(api.POST('/v1/lotes/{id}/vender', { params }));
  }
}
