import { afterEach, describe, expect, it, vi } from 'vitest';
import { observarEventosPublicos } from './eventos-publicos.server';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/config/env.server', () => ({
  getServerEnv: () => ({ API_URL: 'http://api.exemplo.test' }),
}));

afterEach(() => vi.unstubAllGlobals());

describe('Fluxo público de eventos', () => {
  it('repassa o stream sem cookies, cache ou referência', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('event: heartbeat\ndata: {}\n\n'),
        );
        controller.close();
      },
    });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(stream));
    vi.stubGlobal('fetch', fetch);
    const abortar = new AbortController();

    const resposta = await observarEventosPublicos('token', abortar.signal);

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('Content-Type')).toBe(
      'text/event-stream; charset=utf-8',
    );
    expect(resposta.headers.get('Cache-Control')).toBe(
      'no-store, no-transform',
    );
    expect(resposta.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(resposta.headers.get('X-Accel-Buffering')).toBe('no');
    expect(await resposta.text()).toContain('event: heartbeat');

    const [url, opcoes] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      'http://api.exemplo.test/v1/publico/token/eventos',
    );
    expect(opcoes?.headers).toEqual({ accept: 'text/event-stream' });
    expect(opcoes?.cache).toBe('no-store');
    expect(opcoes?.signal).toBe(abortar.signal);
  });

  it('não repassa erros da API para o navegador', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response('erro interno', { status: 500 }))
      .mockRejectedValueOnce(new Error('sem conexão'));
    vi.stubGlobal('fetch', fetch);

    expect((await observarEventosPublicos('token')).status).toBe(404);
    expect((await observarEventosPublicos('token')).status).toBe(502);
    expect((await observarEventosPublicos('token')).status).toBe(502);
  });
});
