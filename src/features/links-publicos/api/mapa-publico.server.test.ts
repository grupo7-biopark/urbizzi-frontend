import { afterEach, describe, it, expect, vi } from 'vitest';
import { getMapaPublico } from './mapa-publico.server';
import { getTilePublico } from './tiles-publicos.server';
vi.mock('server-only', () => ({}));
vi.mock('@/shared/config/env.server', () => ({
  getServerEnv: () => ({ API_URL: 'http://api.exemplo.test' }),
}));
afterEach(() => vi.unstubAllGlobals());
describe('Consultas públicas sem sessão', () => {
  it('consulta a página do mapa sem autenticação nem cache', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          contatoComercial: 'Equipe',
          vendedor: { email: 'interno@exemplo.test' },
          planta: {
            id: 'planta',
            nome: 'Planta',
            versao: 1,
            larguraPx: 256,
            alturaPx: 256,
            maxZoom: 0,
            tamanhoTile: 256,
            tilesUrl: 'interno',
            usuarioId: 'interno',
          },
          marcadores: {
            data: [
              {
                id: 'm1',
                loteId: 'l1',
                x: 0.5,
                y: 0.5,
                numero: '12',
                quadraId: 'q1',
                quadra: 'A',
                loteamentoId: 'lt1',
                loteamento: 'Jardim',
                areaM2: '360',
                status: 'DISPONIVEL',
                valor: null,
                cliente: { nome: 'Interno' },
                proposta: { valor: '1' },
              },
            ],
            meta: { page: 2, pageSize: 100, total: 101, totalPages: 2 },
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetch);
    const dados = await getMapaPublico('token', 2);
    expect(dados.contatoComercial).toBe('Equipe');
    expect(dados).not.toHaveProperty('vendedor');
    expect(dados.planta).not.toHaveProperty('usuarioId');
    expect(dados.planta.tilesUrl).toBe('');
    expect(dados.marcadores.data[0]).not.toHaveProperty('cliente');
    expect(dados.marcadores.data[0]).not.toHaveProperty('proposta');
    expect(dados.marcadores.data[0]).not.toHaveProperty('valor');
    const request = fetch.mock.calls[0]![0] as Request;
    expect(request.headers.has('authorization')).toBe(false);
    expect(request.cache).toBe('no-store');
    expect(request.url).toContain('page=2');
  });
  it('repassa somente a imagem pública e remove detalhes dos erros', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response('imagem'))
      .mockResolvedValueOnce(new Response('privado', { status: 404 }))
      .mockResolvedValueOnce(new Response('privado', { status: 500 }))
      .mockRejectedValueOnce(new Error('privado'));
    vi.stubGlobal('fetch', fetch);
    const args = { id: 'id', z: '0', x: '0', y: '0.webp' };
    expect((await getTilePublico(args)).headers.get('Content-Type')).toBe(
      'image/webp',
    );
    expect((await getTilePublico(args)).status).toBe(404);
    expect((await getTilePublico(args)).status).toBe(502);
    expect((await getTilePublico(args)).status).toBe(502);
  });
});
