import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

// O fluxo principal também roda contra o backend real, com E2E_API_URL, E2E_EMAIL e
// E2E_SENHA (um Administrador). Os demais usam os usuários da API falsa.
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const SEM_API_FALSA = !!process.env.E2E_API_URL;

async function entrar(page: Page, email = EMAIL, senha = SENHA) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

async function entrarComSucesso(page: Page, email = EMAIL, senha = SENHA) {
  await entrar(page, email, senha);
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

/** O esqueleto só some depois da hidratação, quando a busca termina. */
async function abrirListagem(page: Page, busca = '') {
  await page.goto(`/usuarios${busca}`);
  await expect(page.getByLabel('Carregando: Usuários')).toBeHidden();
}

function linhaDe(page: Page, nome: string) {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: nome, exact: true }) });
}

/** Em um navegador à parte, para não sair da sessão do Administrador. */
async function comOutraSessao(
  browser: Browser,
  baseURL: string,
  acao: (page: Page) => Promise<void>,
) {
  const contexto = await browser.newContext({ baseURL });
  try {
    await acao(await contexto.newPage());
  } finally {
    await contexto.close();
  }
}

test('cria, entra com a conta nova, muda o perfil e desativa', async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const sufixo = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const nome = `Usuário E2E ${sufixo}`;
  const email = `e2e.usuario.${sufixo}@exemplo.com`;
  const senha = `Senha-inicial-${sufixo}`;
  await entrarComSucesso(page);

  // Criar
  await abrirListagem(page);
  await page.getByRole('link', { name: 'Novo usuário' }).first().click();
  await expect(page).toHaveURL('/usuarios/novo');
  const campoNome = page.getByLabel('Nome');
  await expect(async () => {
    await campoNome.fill(nome);
    await expect(campoNome).toHaveValue(nome, { timeout: 1000 });
  }).toPass();
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Perfil').selectOption({ label: 'Comercial' });
  await page.getByLabel('Senha inicial').fill(senha);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(
    page.getByText('Usuário cadastrado', { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL('/usuarios');

  // E-mail repetido: o erro aparece no campo, em português
  await page.goto('/usuarios/novo');
  await expect(async () => {
    await campoNome.fill(`${nome} 2`);
    await page.getByLabel('E-mail').fill(email.toUpperCase());
    await page.getByLabel('Perfil').selectOption({ label: 'Consulta' });
    await page.getByLabel('Senha inicial').fill(senha);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByLabel('E-mail')).toHaveAttribute(
      'aria-invalid',
      'true',
      { timeout: 3000 },
    );
  }).toPass();
  await expect(page).toHaveURL('/usuarios/novo');

  // A conta nova entra, e o Comercial não vê a gestão de usuários
  await comOutraSessao(browser, baseURL as string, async (outra) => {
    await entrarComSucesso(outra, email, senha);
    const resposta = await outra.goto('/usuarios');
    expect(resposta?.status()).toBe(403);
  });

  // Filtrar e mudar o perfil
  await abrirListagem(page, '?perfil=COMERCIAL&situacao=ativos');
  await linhaDe(page, nome)
    .getByRole('link', { name: `Editar ${nome}` })
    .click();
  await expect(page.getByLabel('Nome')).toHaveValue(nome);
  await page.getByLabel('Perfil').selectOption({ label: 'Gestor' });
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(
    page.getByText('Usuário atualizado', { exact: true }),
  ).toBeVisible();
  await abrirListagem(page, '?perfil=GESTOR');
  await expect(linhaDe(page, nome).getByText('Gestor')).toBeVisible();

  // Desativar: a conta deixa de entrar
  await linhaDe(page, nome)
    .getByRole('button', { name: `Desativar ${nome}` })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Desativar usuário' })
    .click();
  await expect(
    page.getByText('Usuário desativado', { exact: true }),
  ).toBeVisible();
  await expect(linhaDe(page, nome).getByText('Inativo')).toBeVisible();

  await comOutraSessao(browser, baseURL as string, async (outra) => {
    await entrar(outra, email, senha);
    await expect(
      outra.getByText('E-mail ou senha incorretos, ou usuário inativo.'),
    ).toBeVisible();
  });
});

test.describe('com os usuários da API falsa', () => {
  test.skip(SEM_API_FALSA, 'Depende dos usuários da API falsa.');

  test('o último administrador não é desativado', async ({ page }) => {
    await entrarComSucesso(page);
    await abrirListagem(page, '?perfil=ADMINISTRADOR');

    await linhaDe(page, 'Pessoa Teste')
      .getByRole('button', { name: 'Desativar Pessoa Teste' })
      .click();
    const dialogo = page.getByRole('dialog');
    await dialogo.getByRole('button', { name: 'Desativar usuário' }).click();

    await expect(dialogo.getByRole('alert')).toContainText(
      'último administrador',
    );
    await dialogo.getByRole('button', { name: 'Voltar' }).click();
    await expect(
      linhaDe(page, 'Pessoa Teste').getByText('Ativo'),
    ).toBeVisible();
  });

  for (const email of ['gestor@exemplo.com', 'consulta@exemplo.com']) {
    test(`${email} não acessa a gestão de usuários`, async ({ page }) => {
      await entrarComSucesso(page, email);

      for (const rota of ['/usuarios', '/usuarios/novo']) {
        const resposta = await page.goto(rota);
        expect(resposta?.status(), rota).toBe(403);
      }
    });
  }

  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`no tema ${colorScheme}`, () => {
      test.use({ colorScheme });

      test('as telas não têm violações de acessibilidade', async ({ page }) => {
        await entrarComSucesso(page);

        await abrirListagem(page);
        await expect(
          linhaDe(page, 'Pessoa Teste').getByText('Administrador'),
        ).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );

        await page.goto('/usuarios/novo');
        await expect(page.getByLabel('Senha inicial')).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      });
    });
  }

  test('no celular, a listagem vira cartões sem rolagem horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await entrarComSucesso(page);
    await abrirListagem(page);

    await expect(
      page.getByRole('button', { name: 'Desativar Pessoa Teste' }),
    ).toBeVisible();
    const excesso = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(excesso).toBeLessThanOrEqual(0);
  });
});
