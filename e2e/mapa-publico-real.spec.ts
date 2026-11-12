import { randomBytes } from 'node:crypto';
import { AxeBuilder } from '@axe-core/playwright';
import type { components } from '../src/shared/api/schema';
import { api, expect, test } from './support/reservas.fixture';

test.skip(!process.env.E2E_API_URL, 'Requer backend real e banco de teste.');

test('mapa público omite valor e dados internos e recusa token inativo', async ({
  request,
  browser,
  cenario,
  scenario,
  baseURL,
}) => {
  const lote = await api<components['schemas']['LoteDto']>(
    request,
    'POST',
    '/lotes',
    {
      quadraId: cenario.lote.quadraId,
      numero: '13',
      areaM2: '200.00',
      valor: '999999.00',
      exibirValorPublico: false,
    },
  );
  await api(request, 'POST', `/plantas/${scenario.plantaId}/marcadores`, {
    loteId: lote.id,
    x: 0.4,
    y: 0.4,
  });
  const reserva = await api<components['schemas']['ReservaDto']>(
    request,
    'POST',
    '/reservas',
    { loteId: lote.id, clienteId: cenario.cliente.id },
  );
  const link = await api<components['schemas']['LinkPublicoDto']>(
    request,
    'POST',
    '/links-publicos',
    { loteamentoId: lote.loteamentoId },
  );
  const anonimo = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    storageState: { cookies: [], origins: [] },
  });
  try {
    const page = await anonimo.newPage();
    const rota = `/p/${link.token}`;
    const respostasPublicas: string[] = [];
    const rotasInternas: string[] = [];
    const eventos: unknown[] = [];
    // Lê as respostas reais (HTML e atualizações do Server Component) antes de
    // entregá-las ao navegador. O fluxo SSE continua aberto normalmente.
    await page.route(
      (url) => url.pathname === rota,
      async (route) => {
        const resposta = await route.fetch();
        if (resposta.ok()) respostasPublicas.push(await resposta.text());
        await route.fulfill({ response: resposta });
      },
    );
    page.on('request', (requisicao) => {
      const { pathname } = new URL(requisicao.url());
      if (
        pathname.startsWith('/api/backend/') ||
        pathname.startsWith('/api/auth/')
      ) {
        rotasInternas.push(pathname);
      }
    });
    await page.exposeFunction('registrarStatusPublico', (evento: string) => {
      eventos.push(JSON.parse(evento));
    });
    await page.addInitScript(() => {
      window.EventSource = class extends EventSource {
        constructor(url: string | URL, init?: EventSourceInit) {
          super(url, init);
          this.addEventListener(
            'status-lote',
            (event: MessageEvent<string>) => {
              void (
                window as Window & {
                  registrarStatusPublico?: (data: string) => Promise<void>;
                }
              ).registrarStatusPublico?.(event.data);
            },
          );
        }
      };
    });
    const response = await page.goto(rota);
    expect(response?.headers()['referrer-policy']).toBe('no-referrer');
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
    await expect(page.getByText('Ao vivo', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Localizar na planta' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Lote 13' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByText('Valor', { exact: true })).toHaveCount(0);
    await expect(
      page.locator('meta[property="og:image"]').first(),
    ).toHaveAttribute('content', /urbizzi-mapa-publico\.png$/);
    expect(await anonimo.cookies()).toHaveLength(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await api(request, 'POST', `/reservas/${reserva.id}/cancelar`, {
      motivo: 'Cancelar reserva fictícia para validar o evento público.',
    });
    await expect
      .poll(() => eventos)
      .toEqual([{ loteId: lote.id, status: 'DISPONIVEL' }]);
    await expect(
      dialogo.getByText('Disponível', { exact: true }),
    ).toBeVisible();
    expect(rotasInternas).toEqual([]);
    expect(respostasPublicas.length).toBeGreaterThan(0);
    for (const corpo of respostasPublicas) {
      expect(corpo).not.toContain(cenario.cliente.nome);
      expect(corpo).not.toContain(cenario.cliente.id);
      expect(corpo).not.toContain('999999.00');
      expect(corpo).not.toMatch(/clienteId|senhaHash|vendedorId|propostaAtual/);
    }
    await page.goto(`/p/${randomBytes(32).toString('base64url')}`);
    await expect(
      page.getByRole('heading', { name: 'Mapa indisponível' }),
    ).toBeVisible();
    await api(request, 'POST', `/links-publicos/${link.id}/desativar`);
    await page.goto(`/p/${link.token}`);
    await expect(
      page.getByRole('heading', { name: 'Mapa indisponível' }),
    ).toBeVisible();
  } finally {
    await anonimo.close();
    await api(request, 'POST', `/links-publicos/${link.id}/desativar`);
  }
});
