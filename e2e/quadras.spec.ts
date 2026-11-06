import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// O fluxo de cadastro também roda contra o backend real, com E2E_API_URL, E2E_EMAIL
// e E2E_SENHA. Os demais usam os dados da API falsa (e2e/support/fake-api.mjs).
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const SEM_API_FALSA = !!process.env.E2E_API_URL;
const SEMENTE_ID = '4f0d7a5c-2e96-4ecf-9b7d-6a1d5c9e3f54';

async function entrar(page: Page, email = EMAIL) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

/** Mesma origem do navegador: passa pelo proxy e usa a sessão de quem entrou. */
function chamarApi(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ([metodo, caminho, corpo]) => {
      const response = await fetch(`/api/backend${caminho as string}`, {
        method: metodo as string,
        headers: { 'Content-Type': 'application/json' },
        ...(corpo ? { body: JSON.stringify(corpo) } : {}),
      });
      const text = await response.text();
      return {
        status: response.status,
        body: (text ? JSON.parse(text) : null) as { id: string } | null,
      };
    },
    [method, path, body] as const,
  );
}

/** O esqueleto só some depois da hidratação, quando a busca termina. */
async function abrirDetalhe(page: Page, id: string) {
  await page.goto(`/loteamentos/${id}`);
  await expect(page.getByLabel('Carregando: Quadras')).toBeHidden();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Quadras' }),
  ).toBeVisible();
}

test('cria, recusa duplicada, edita, não remove com lotes e remove sem lotes', async ({
  page,
}) => {
  test.slow();
  await entrar(page);
  const loteamento = await chamarApi(page, 'POST', '/v1/loteamentos', {
    nome: `Loteamento Quadras ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  });
  expect(loteamento.status).toBe(201);
  const loteamentoId = loteamento.body?.id as string;
  await abrirDetalhe(page, loteamentoId);
  await expect(page.getByText('Nenhuma quadra cadastrada')).toBeVisible();

  // Criar: aparece sem recarregar, e o campo fica pronto para a próxima
  const campo = page.getByRole('textbox', { name: 'Número' });
  await campo.fill('A1');
  await page.getByRole('button', { name: 'Adicionar quadra' }).click();
  await expect(
    page.getByRole('button', { name: 'Editar a quadra A1' }),
  ).toBeVisible();
  await expect(
    page.getByText('Quadra cadastrada', { exact: true }),
  ).toBeVisible();
  await expect(campo).toHaveValue('');
  await expect(campo).toBeFocused();

  // Duplicada, sem diferenciar maiúsculas: o erro aparece no campo, em português
  await campo.fill('a1');
  await page.getByRole('button', { name: 'Adicionar quadra' }).click();
  await expect(campo).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(/já existe/i)).toBeVisible();
  await expect(campo).toHaveValue('a1');
  await expect(page.getByText('1 resultado')).toBeVisible();

  // Editar
  await page.getByRole('button', { name: 'Editar a quadra A1' }).click();
  const edicao = page.getByRole('dialog');
  await edicao.getByRole('textbox', { name: 'Número' }).fill('B2');
  await edicao.getByRole('button', { name: 'Salvar' }).click();
  await expect(edicao).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Editar a quadra B2' }),
  ).toBeVisible();

  const quadras = await page.evaluate(async (id) => {
    const response = await fetch(`/api/backend/v1/loteamentos/${id}/quadras`);
    return (await response.json()) as { data: { id: string }[] };
  }, loteamentoId);
  const quadraId = quadras.data[0]?.id as string;

  // Com lote: a API recusa, e a confirmação continua aberta com o motivo
  const lote = await chamarApi(page, 'POST', '/v1/lotes', {
    quadraId,
    numero: '1',
    areaM2: '360.00',
  });
  expect(lote.status).toBe(201);
  await page.getByRole('button', { name: 'Remover a quadra B2' }).click();
  const confirmacao = page.getByRole('dialog');
  await confirmacao.getByRole('button', { name: 'Remover quadra' }).click();
  await expect(confirmacao.getByRole('alert')).toContainText(/lotes/i);
  await confirmacao.getByRole('button', { name: 'Voltar' }).click();
  await expect(
    page.getByRole('button', { name: 'Editar a quadra B2' }),
  ).toBeVisible();

  // Sem lote: remove e volta ao estado vazio
  const semLote = await chamarApi(
    page,
    'DELETE',
    `/v1/lotes/${lote.body?.id as string}`,
  );
  expect(semLote.status).toBe(204);
  await page.getByRole('button', { name: 'Remover a quadra B2' }).click();
  await confirmacao.getByRole('button', { name: 'Remover quadra' }).click();
  await expect(
    page.getByText('Quadra removida', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Nenhuma quadra cadastrada')).toBeVisible();

  // Não deixa o loteamento de teste para trás: no backend real, o banco é o do time.
  const limpeza = await chamarApi(
    page,
    'DELETE',
    `/v1/loteamentos/${loteamentoId}`,
  );
  expect(limpeza.status).toBe(204);
});

test.describe('com os dados da API falsa', () => {
  test.skip(SEM_API_FALSA, 'Depende dos usuários e dos dados da API falsa.');

  test('Consulta vê as quadras, sem o cadastro e sem as ações', async ({
    page,
  }) => {
    await entrar(page, 'consulta@exemplo.com');
    await abrirDetalhe(page, SEMENTE_ID);

    await expect(page.getByText('Quadra Semente')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Adicionar quadra' }),
    ).toBeHidden();
    await expect(
      page.getByRole('button', { name: /a quadra Quadra Semente/ }),
    ).toBeHidden();
  });

  test('no celular, as quadras não criam rolagem horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await entrar(page, 'gestor@exemplo.com');
    await abrirDetalhe(page, SEMENTE_ID);

    await expect(
      page.getByRole('button', { name: 'Editar a quadra Quadra Semente' }),
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

      test('o painel e o diálogo não têm violações de acessibilidade', async ({
        page,
      }) => {
        await entrar(page, 'gestor@exemplo.com');
        await abrirDetalhe(page, SEMENTE_ID);
        await expect(page.getByText('Quadra Semente')).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );

        await page
          .getByRole('button', { name: 'Editar a quadra Quadra Semente' })
          .click();
        await expect(page.getByRole('dialog')).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      });
    });
  }
});
