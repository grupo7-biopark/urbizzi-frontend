import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gerarCpf } from './support/documento';

// O fluxo principal também roda contra o backend real, com E2E_API_URL, E2E_EMAIL e
// E2E_SENHA. Os demais usam os usuários da API falsa (e2e/support/fake-api.mjs).
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const SEM_API_FALSA = !!process.env.E2E_API_URL;

async function entrar(page: Page, email = EMAIL) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

/** Mesma origem do navegador: passa pelo proxy e usa a sessão de quem entrou. */
async function chamarApi(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
) {
  const resposta = await page.evaluate(
    async ([metodo, caminho, corpo]) => {
      const response = await fetch(`/api/backend${caminho as string}`, {
        method: metodo as string,
        headers: { 'Content-Type': 'application/json' },
        ...(corpo ? { body: JSON.stringify(corpo) } : {}),
      });
      const text = await response.text();
      return {
        status: response.status,
        body: text ? (JSON.parse(text) as { id: string }) : null,
      };
    },
    [method, path, body] as const,
  );

  expect(resposta.status, `${method} ${path}`).toBeLessThan(300);
  return resposta.body as { id: string };
}

function sufixo() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function criarCadastros(page: Page) {
  const nome = `Loteamento Lotes ${sufixo()}`;
  const loteamento = await chamarApi(page, 'POST', '/v1/loteamentos', { nome });
  const quadra = await chamarApi(
    page,
    'POST',
    `/v1/loteamentos/${loteamento.id}/quadras`,
    { numero: 'Q1' },
  );

  return { nome, loteamentoId: loteamento.id, quadraId: quadra.id };
}

/** O esqueleto só some depois da hidratação, quando a busca termina. */
async function abrirListagem(page: Page, busca = '') {
  await page.goto(`/lotes${busca}`);
  await expect(page.getByLabel('Carregando: Lotes')).toBeHidden();
}

function linhaDoLote(page: Page, numero: string) {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: numero, exact: true }) });
}

test('abre o detalhe completo a partir da listagem', async ({ page }) => {
  await entrar(page);
  const { loteamentoId, quadraId, nome } = await criarCadastros(page);
  const lote = await chamarApi(page, 'POST', '/v1/lotes', {
    quadraId,
    numero: 'D17',
    areaM2: '360.00',
    valor: '250000.00',
  });
  await abrirListagem(page, `?loteamentoId=${loteamentoId}`);
  await page.getByRole('link', { name: 'D17', exact: true }).click();
  await expect(page).toHaveURL(`/lotes/${lote.id}`);
  await expect(page.getByRole('heading', { name: 'Lote D17' })).toBeVisible();
  await expect(page.getByText(`${nome} · Quadra Q1`)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Histórico recente' }),
  ).toBeVisible();
});

test('cria, recusa duplicado, filtra, edita o valor e não remove lote reservado', async ({
  page,
}) => {
  test.slow();
  await entrar(page);
  const { nome, loteamentoId, quadraId } = await criarCadastros(page);

  // Criar: as opções de quadra dependem do loteamento, e área e valor têm máscara
  await page.goto('/lotes/novo');
  await expect(page.getByRole('option', { name: nome })).toBeAttached();
  await page.getByLabel('Loteamento').selectOption({ label: nome });
  await expect(page.getByRole('option', { name: 'Q1' })).toBeAttached();
  await page.getByLabel('Quadra').selectOption({ label: 'Q1' });
  await page.getByLabel('Número').fill('12');
  await page.getByLabel('Área').pressSequentially('36000');
  await page
    .getByRole('textbox', { name: 'Valor' })
    .pressSequentially('25000000');
  await expect(page.getByLabel('Área')).toHaveValue('360,00');
  await expect(page.getByRole('textbox', { name: 'Valor' })).toHaveValue(
    'R$ 250.000,00',
  );
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(
    page.getByText('Lote cadastrado', { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL('/lotes');

  const filtroDoLoteamento = `?loteamentoId=${loteamentoId}`;
  await abrirListagem(page, filtroDoLoteamento);
  const linha = linhaDoLote(page, '12');
  await expect(linha.getByText(nome)).toBeVisible();
  await expect(linha.getByText('Q1')).toBeVisible();
  await expect(linha.getByText('360,00 m²')).toBeVisible();
  await expect(linha.getByText('R$ 250.000,00')).toBeVisible();
  await expect(linha.getByText('Disponível')).toBeVisible();

  // Duplicado: mensagem clara no campo
  await page.goto('/lotes/novo');
  await expect(page.getByRole('option', { name: nome })).toBeAttached();
  await page.getByLabel('Loteamento').selectOption({ label: nome });
  await expect(page.getByRole('option', { name: 'Q1' })).toBeAttached();
  await page.getByLabel('Quadra').selectOption({ label: 'Q1' });
  await page.getByLabel('Número').fill('12');
  await page.getByLabel('Área').pressSequentially('36000');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByLabel('Número')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByText(/já existe/i)).toBeVisible();
  await expect(page).toHaveURL('/lotes/novo');

  // Editar o valor
  await abrirListagem(page, filtroDoLoteamento);
  await linhaDoLote(page, '12')
    .getByRole('link', { name: 'Editar o lote 12' })
    .click();
  await expect(page.getByRole('textbox', { name: 'Valor' })).toHaveValue(
    'R$ 250.000,00',
  );
  await page.getByRole('textbox', { name: 'Valor' }).fill('');
  await page
    .getByRole('textbox', { name: 'Valor' })
    .pressSequentially('30000000');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(
    page.getByText('Lote atualizado', { exact: true }),
  ).toBeVisible();

  await abrirListagem(page, filtroDoLoteamento);
  await expect(
    linhaDoLote(page, '12').getByText('R$ 300.000,00'),
  ).toBeVisible();

  // Reservar pela API: o fluxo de reserva tem tela própria
  const lotes = await page.evaluate(async (id) => {
    const response = await fetch(`/api/backend/v1/lotes?loteamentoId=${id}`);
    return (await response.json()) as { data: { id: string }[] };
  }, loteamentoId);
  const loteId = lotes.data[0]?.id as string;
  const cliente = await chamarApi(page, 'POST', '/v1/clientes', {
    nome: 'Cliente E2E Lotes',
    documento: gerarCpf(),
  });
  await chamarApi(page, 'POST', '/v1/reservas', {
    loteId,
    clienteId: cliente.id,
  });

  // Um lote disponível, para o filtro ter o que separar
  await chamarApi(page, 'POST', '/v1/lotes', {
    quadraId,
    numero: '13',
    areaM2: '400.00',
  });

  // Filtros combinados ficam na URL e sobrevivem ao recarregar
  await abrirListagem(page, filtroDoLoteamento);
  await expect(linhaDoLote(page, '13')).toBeVisible();
  await page.getByLabel('Status').selectOption({ label: 'Reservado' });
  await expect(page).toHaveURL(new RegExp(`status=RESERVADO`));
  await expect(page).toHaveURL(new RegExp(`loteamentoId=${loteamentoId}`));
  await expect(linhaDoLote(page, '13')).toBeHidden();
  await expect(linhaDoLote(page, '12').getByText('Reservado')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Status')).toHaveValue('RESERVADO');
  await expect(linhaDoLote(page, '13')).toBeHidden();

  // Lote reservado não é removido, e a confirmação mostra o motivo
  await linhaDoLote(page, '12')
    .getByRole('button', { name: 'Remover o lote 12' })
    .click();
  const confirmacao = page.getByRole('dialog');
  await confirmacao.getByRole('button', { name: 'Remover lote' }).click();
  await expect(confirmacao.getByRole('alert')).toContainText('disponível');
  await confirmacao.getByRole('button', { name: 'Voltar' }).click();
  await expect(linhaDoLote(page, '12')).toBeVisible();

  // Lote disponível é removido
  await page.getByLabel('Status').selectOption({ label: 'Disponível' });
  await linhaDoLote(page, '13')
    .getByRole('button', { name: 'Remover o lote 13' })
    .click();
  await confirmacao.getByRole('button', { name: 'Remover lote' }).click();
  await expect(page.getByText('Lote removido', { exact: true })).toBeVisible();
  await expect(linhaDoLote(page, '13')).toBeHidden();
});

test('o link da linha abre o lote', async ({ page }) => {
  await entrar(page);
  const { loteamentoId, quadraId } = await criarCadastros(page);
  const lote = await chamarApi(page, 'POST', '/v1/lotes', {
    quadraId,
    numero: '1',
    areaM2: '100.00',
  });

  await abrirListagem(page, `?loteamentoId=${loteamentoId}`);
  await page.getByRole('link', { name: '1', exact: true }).click();

  await expect(page).toHaveURL(`/lotes/${lote.id}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Lote' }),
  ).toBeVisible();

  await chamarApi(page, 'DELETE', `/v1/lotes/${lote.id}`);
  await chamarApi(page, 'DELETE', `/v1/quadras/${quadraId}`);
  await chamarApi(page, 'DELETE', `/v1/loteamentos/${loteamentoId}`);
});

test.describe('com os usuários da API falsa', () => {
  test.skip(SEM_API_FALSA, 'Depende dos usuários da API falsa.');

  for (const email of ['comercial@exemplo.com', 'consulta@exemplo.com']) {
    test(`${email} não vê as ações de edição`, async ({ page }) => {
      test.slow();
      await entrar(page, 'gestor@exemplo.com');
      const { loteamentoId, quadraId } = await criarCadastros(page);
      const lote = await chamarApi(page, 'POST', '/v1/lotes', {
        quadraId,
        numero: '1',
        areaM2: '100.00',
      });
      await page.getByRole('button', { name: 'Sair' }).click();
      await expect(page).toHaveURL(/\/login/);

      await entrar(page, email);
      await abrirListagem(page, `?loteamentoId=${loteamentoId}`);

      await expect(linhaDoLote(page, '1')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Novo lote' })).toBeHidden();
      await expect(
        page.getByRole('columnheader', { name: 'Ações' }),
      ).toBeHidden();

      for (const rota of ['/lotes/novo', `/lotes/${lote.id}/editar`]) {
        const resposta = await page.goto(rota);
        expect(resposta?.status(), rota).toBe(403);
      }
    });
  }

  test('no celular, a listagem vira cartões sem rolagem horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await entrar(page, 'gestor@exemplo.com');
    const { loteamentoId, quadraId } = await criarCadastros(page);
    await chamarApi(page, 'POST', '/v1/lotes', {
      quadraId,
      numero: '1',
      areaM2: '100.00',
      valor: '999999999.00',
    });

    await abrirListagem(page, `?loteamentoId=${loteamentoId}`);

    await expect(
      page.getByRole('button', { name: 'Remover o lote 1' }),
    ).toBeVisible();
    const excesso = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(excesso).toBeLessThanOrEqual(0);
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`no tema ${colorScheme}`, () => {
      test.use({ colorScheme });

      test('as telas não têm violações de acessibilidade', async ({ page }) => {
        test.slow();
        await entrar(page, 'gestor@exemplo.com');
        const { nome, loteamentoId, quadraId } = await criarCadastros(page);
        const lote = await chamarApi(page, 'POST', '/v1/lotes', {
          quadraId,
          numero: '1',
          areaM2: '100.00',
        });

        await abrirListagem(page, `?loteamentoId=${loteamentoId}`);
        await expect(linhaDoLote(page, '1').getByText(nome)).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );

        await page.goto('/lotes/novo');
        await expect(page.getByLabel('Número')).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );

        await page.goto(`/lotes/${lote.id}/editar`);
        await expect(page.getByLabel('Número')).toHaveValue('1');
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      });
    });
  }
});
