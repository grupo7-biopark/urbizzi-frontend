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
      new Response(JSON.stringify({ contatoComercial: 'Equipe' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    expect(await getMapaPublico('token', 2)).toEqual({
      contatoComercial: 'Equipe',
    });
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
