import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { components } from '../src/shared/api/schema';
import { api, como, expect, reservar, test } from './support/reservas.fixture';
import { excessoHorizontal } from './support/sessao';
import { vencerReserva } from './support/vencer-reserva.mjs';

type Lote = components['schemas']['LoteDto'];
type Reserva = components['schemas']['ReservaDto'];
type LinkPublico = components['schemas']['LinkPublicoDto'];

const TELAS = {
  computador: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  celular: { width: 390, height: 844 },
};

async function conferirTela(page: Page, descricao: string) {
  await expect(page.getByRole('status', { name: /^Carregando/ })).toHaveCount(
    0,
  );
  await expect
    .poll(() => excessoHorizontal(page), { message: descricao })
    .toBeLessThanOrEqual(0);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      alvos: nodes.map(({ target }) => target),
    })),
    descricao,
  ).toEqual([]);
}

test.skip(
  !process.env.E2E_API_URL ||
    !process.env.E2E_BACKEND_DIR ||
    !process.env.DATABASE_URL,
  'Requer backend real e banco isolado de teste.',
);

for (const [nome, viewport] of Object.entries(TELAS)) {
  test.describe(nome, () => {
    test.use({ viewport, reducedMotion: 'reduce' });

    test('Comercial reserva e propõe, Gestor aprova e vende', async ({
      page,
      browser,
      request,
      cenario,
    }, testInfo) => {
      const comercial = await como(browser, 'comercial', testInfo);
      const detalhe = `/lotes/${cenario.lote.id}`;
      const condicoes = `Proposta de teste ${cenario.lote.id}`;
      try {
        await comercial.page.setViewportSize(viewport);
        await comercial.page.goto(detalhe);
        await reservar(comercial.page, cenario.cliente.nome);
        await comercial.page
          .getByRole('button', { name: 'Criar proposta', exact: true })
          .click();
        const proposta = comercial.page.getByRole('dialog');
        await proposta.getByLabel('Valor proposto').fill('20000000');
        await proposta.getByLabel('Condições de pagamento').fill(condicoes);
        await conferirTela(comercial.page, 'Formulário de proposta');
        await proposta.getByRole('button', { name: 'Enviar proposta' }).click();
        await expect(
          comercial.page.getByText('Proposta enviada para análise', {
            exact: true,
          }),
        ).toBeVisible();

        await page.goto('/propostas/pendencias');
        const linha = page.getByRole('row').filter({ hasText: condicoes });
        await expect(linha).toBeVisible();
        await conferirTela(page, 'Pendências do gestor');
        await linha.getByRole('button', { name: 'Analisar proposta' }).click();
        const decisao = page.getByRole('dialog');
        await decisao
          .getByRole('combobox', { name: /^Decisão/ })
          .selectOption('aprovar');
        await decisao
          .getByLabel('Motivo da decisão')
          .fill('Aprovação de teste');
        await conferirTela(page, 'Decisão do gestor');
        await decisao
          .getByRole('button', { name: 'Confirmar decisão' })
          .click();
        await expect(linha).toHaveCount(0);

        await page.goto(detalhe);
        await page
          .getByRole('button', { name: 'Marcar como Vendido', exact: true })
          .click();
        const venda = page.getByRole('dialog');
        await conferirTela(page, 'Confirmação da venda');
        await venda
          .getByRole('checkbox', { name: /não pode ser desfeita/ })
          .check();
        await venda
          .getByRole('button', { name: 'Marcar como Vendido', exact: true })
          .click();
        await expect(
          page.getByText('Vendido', { exact: true }).first(),
        ).toBeVisible();
        await conferirTela(page, 'Detalhe do lote vendido');
        const registrado = await api<components['schemas']['LoteDetalheDto']>(
          request,
          'GET',
          `${detalhe}/detalhe`,
        );
        expect(registrado.lote.status).toBe('VENDIDO');
        expect(registrado.reserva?.status).toBe('CONVERTIDA');
        expect(registrado.propostas).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ status: 'APROVADA' }),
          ]),
        );
      } finally {
        await comercial.context.close();
      }
    });

    test('Gestor bloqueia e desbloqueia o lote e publica o mapa', async ({
      page,
      browser,
      request,
      cenario,
      scenario,
      baseURL,
    }) => {
      await page.goto(`/lotes/${cenario.lote.id}`);
      await page
        .getByRole('button', { name: 'Bloquear lote', exact: true })
        .click();
      const dialogo = page.getByRole('dialog');
      await dialogo
        .getByRole('textbox', { name: /Motivo/ })
        .fill('Bloqueio de teste');
      await dialogo
        .getByRole('button', { name: 'Bloquear lote', exact: true })
        .click();
      await expect(
        page.getByText('Bloqueado', { exact: true }).first(),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Desbloquear lote', exact: true })
        .click();
      await dialogo
        .getByRole('button', { name: 'Desbloquear lote', exact: true })
        .click();
      await expect(
        page.getByText('Disponível', { exact: true }).first(),
      ).toBeVisible();

      await api(request, 'POST', `/plantas/${scenario.plantaId}/marcadores`, {
        loteId: cenario.lote.id,
        x: 0.4,
        y: 0.4,
      });
      await page.goto('/links-publicos');
      await page
        .getByRole('button', { name: 'Gerar link', exact: true })
        .click();
      await dialogo
        .getByLabel('Escopo do mapa')
        .selectOption(cenario.lote.loteamentoId);
      const criacao = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/backend/v1/links-publicos') &&
          response.request().method() === 'POST',
      );
      await dialogo
        .getByRole('button', { name: 'Gerar link', exact: true })
        .click();
      const resposta = await criacao;
      expect(resposta.status()).toBe(201);
      const link = (await resposta.json()) as LinkPublico;
      const anonimo = await browser.newContext({
        baseURL,
        viewport,
        storageState: { cookies: [], origins: [] },
      });
      try {
        const criado = page.getByRole('dialog', {
          name: 'Link público criado',
        });
        const endereco = await criado
          .getByRole('link', { name: 'Abrir mapa' })
          .getAttribute('href');
        expect(endereco).toBe(`${baseURL}/p/${link.token}`);
        const publico = await anonimo.newPage();
        await publico.goto(endereco!);
        await expect(
          publico.getByRole('heading', { name: 'Mapa público', exact: true }),
        ).toBeVisible();
        await publico
          .getByRole('button', { name: 'Localizar na planta' })
          .click();
        await expect(
          publico.getByRole('dialog', { name: 'Lote 12' }),
        ).toBeVisible();
        await conferirTela(publico, 'Detalhe no mapa público');
        expect(await anonimo.cookies()).toHaveLength(0);
        await criado
          .getByRole('button', { name: 'Desativar', exact: true })
          .click();
        await page
          .getByRole('dialog', { name: 'Desativar este link público?' })
          .getByRole('button', { name: 'Desativar link', exact: true })
          .click();
        await expect(
          criado.getByText('O acesso por este link foi encerrado.'),
        ).toBeVisible();
        await publico.reload();
        await expect(
          publico.getByRole('heading', { name: 'Mapa indisponível' }),
        ).toBeVisible();
      } finally {
        await anonimo.close();
        await api(request, 'POST', `/links-publicos/${link.id}/desativar`);
      }
    });

    test('painel com dados reais cabe na tela e passa no axe', async ({
      page,
      cenario,
    }) => {
      await page.goto('/');
      await page
        .getByLabel('Loteamento', { exact: true })
        .selectOption(cenario.lote.loteamentoId);
      await page.getByRole('button', { name: 'Aplicar filtros' }).click();
      const resumo = page.getByRole('region', { name: 'Resumo de lotes' });
      await expect(resumo.getByRole('definition').first()).toHaveText('1');
      await conferirTela(page, 'Painel de indicadores');
    });
  });
}

test('job expira a reserva e libera o lote nos três tamanhos de tela', async ({
  page,
  request,
  cenario,
}) => {
  test.setTimeout(360_000);
  const reserva = await api<Reserva>(request, 'POST', '/reservas', {
    loteId: cenario.lote.id,
    clienteId: cenario.cliente.id,
  });
  await vencerReserva(reserva.id, cenario.lote.id);
  // O backend agenda esse job a cada cinco minutos. Polling usa o status persistido.
  await expect
    .poll(
      async () =>
        (await api<Reserva>(request, 'GET', `/reservas/${reserva.id}`)).status,
      {
        timeout: 325_000,
        intervals: [1000, 3000, 5000],
      },
    )
    .toBe('EXPIRADA');
  const lote = await api<Lote>(request, 'GET', `/lotes/${cenario.lote.id}`);
  expect(lote.status).toBe('DISPONIVEL');
  for (const [nome, viewport] of Object.entries(TELAS)) {
    await page.setViewportSize(viewport);
    await page.goto('/reservas?status=EXPIRADA');
    const linha = page
      .getByRole('row')
      .filter({ hasText: cenario.cliente.nome });
    await expect(linha.getByText('Expirada', { exact: true })).toBeVisible();
    await conferirTela(page, `Reserva expirada em ${nome}`);
    await page.goto(`/lotes/${lote.id}`);
    await expect(
      page.getByRole('button', { name: 'Reservar', exact: true }),
    ).toBeVisible();
  }
});
