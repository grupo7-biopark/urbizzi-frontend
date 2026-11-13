import 'server-only';
import { getServerApi } from '@/shared/api/client.server';
import { unwrap } from '@/shared/api/request';
/** Sem sessão: a única credencial desta consulta é o link público. */
export async function getMapaPublico(token: string, page: number) {
  const { planta, marcadores, contatoComercial } = await unwrap(
    getServerApi().GET('/v1/publico/{token}', {
      params: { path: { token }, query: { page, pageSize: 100 } },
      cache: 'no-store',
    }),
  );
  // Apenas os campos públicos atravessam a fronteira do Server Component.
  const {
    id: plantaId,
    nome,
    versao,
    larguraPx,
    alturaPx,
    maxZoom,
    tamanhoTile,
  } = planta;
  const { page: pagina, pageSize, total, totalPages } = marcadores.meta;
  return {
    planta: {
      id: plantaId,
      nome,
      versao,
      larguraPx,
      alturaPx,
      maxZoom,
      tamanhoTile,
      tilesUrl: '',
    },
    marcadores: {
      data: marcadores.data.map(
        ({
          id,
          loteId,
          x,
          y,
          numero,
          quadraId,
          quadra,
          loteamentoId,
          loteamento,
          areaM2,
          status,
          valor,
        }) => ({
          id,
          loteId,
          x,
          y,
          numero,
          quadraId,
          quadra,
          loteamentoId,
          loteamento,
          areaM2,
          status,
          ...(valor != null ? { valor } : {}),
        }),
      ),
      meta: { page: pagina, pageSize, total, totalPages },
    },
    contatoComercial,
  };
}
