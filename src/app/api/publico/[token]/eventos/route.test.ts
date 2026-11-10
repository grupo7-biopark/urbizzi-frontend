// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const { observarEventosPublicos } = vi.hoisted(() => ({
  observarEventosPublicos:
    vi.fn<(token: string, signal?: AbortSignal) => Response>(),
}));

vi.mock('@/features/links-publicos/api/eventos-publicos.server', () => ({
  observarEventosPublicos,
}));

const TOKEN = 'a'.repeat(43);

function pedido(token: string) {
  return new Request(`http://front.test/api/publico/${token}/eventos`);
}

beforeEach(() => {
  observarEventosPublicos.mockReset();
});

describe('GET /api/publico/[token]/eventos', () => {
  it('repassa o token válido e o sinal da requisição', async () => {
    const repassada = new Response('event: heartbeat\ndata: {}\n\n');
    observarEventosPublicos.mockResolvedValueOnce(repassada);
    const request = pedido(TOKEN);

    const response = await GET(request, {
      params: Promise.resolve({ token: TOKEN }),
    });

    expect(response).toBe(repassada);
    expect(observarEventosPublicos).toHaveBeenCalledWith(TOKEN, request.signal);
  });

  it('encerra o fluxo de um token fora do formato', async () => {
    const request = pedido('curto');

    const response = await GET(request, {
      params: Promise.resolve({ token: 'curto' }),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      'event: conexao-encerrada\ndata: {"motivo":"FLUXO_INDISPONIVEL"}\n\n',
    );
    expect(observarEventosPublicos).not.toHaveBeenCalled();
  });
});
