import { AxeBuilder } from '@axe-core/playwright';
import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';

// No backend real, com E2E_API_URL, E2E_EMAIL, E2E_SENHA e E2E_MAILPIT_URL, o token
// vem do e-mail, no Mailpit. Na API falsa (CI), de uma rota só para o teste.
const API_REAL = !!process.env.E2E_API_URL;
const MAILPIT_URL = process.env.E2E_MAILPIT_URL;
const FAKE_API_URL = process.env.FAKE_API_URL ?? 'http://localhost:3999';
const SENHA_NOVA = `Senha-nova-${Date.now()}`;
const TOKEN_FICTICIO = 'A'.repeat(43);
const MENSAGEM = 'Se este e-mail estiver cadastrado';

test.skip(
  API_REAL && !MAILPIT_URL,
  'No backend real, precisa de E2E_MAILPIT_URL para ler o e-mail.',
);

async function lerTokenDoMailpit(request: APIRequestContext, email: string) {
  const busca = await request.get(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  );
  const { messages } = (await busca.json()) as {
    messages: { ID: string }[];
  };

  if (!messages[0]) {
    return null;
  }

  const mensagem = await request.get(
    `${MAILPIT_URL}/api/v1/message/${messages[0].ID}`,
  );
  const { Text, HTML } = (await mensagem.json()) as {
    Text: string;
    HTML: string;
  };

  return /[?&]token=([\w-]{43})/.exec(`${Text} ${HTML}`)?.[1] ?? null;
}

async function lerTokenDaApiFalsa(request: APIRequestContext, email: string) {
  const resposta = await request.get(
    `${FAKE_API_URL}/__e2e/token-recuperacao?email=${encodeURIComponent(email)}`,
  );

  return ((await resposta.json()) as { token: string | null }).token;
}

async function esperarToken(request: APIRequestContext, email: string) {
  let token: string | null = null;

  await expect
    .poll(
      async () => {
        token = MAILPIT_URL
          ? await lerTokenDoMailpit(request, email)
          : await lerTokenDaApiFalsa(request, email);
        return token;
      },
      { timeout: 30_000 },
    )
    .not.toBeNull();

  return token as unknown as string;
}

/**
 * Na API real, cria uma conta só para o teste, para não trocar a senha de ninguém,
 * e devolve como desativá-la. O banco local só garante o perfil Administrador.
 */
async function prepararConta(browser: Browser, baseURL: string) {
  if (!API_REAL) {
    return {
      email: 'recuperacao@exemplo.com',
      encerrar: async () => undefined,
    };
  }

  const admin = await browser.newContext({ baseURL });
  const headers = { origin: baseURL };
  const entrada = await admin.request.post('/api/auth/login', {
    headers,
    data: {
      email: process.env.E2E_EMAIL,
      senha: process.env.E2E_SENHA,
    },
  });
  expect(entrada.ok(), await entrada.text()).toBe(true);

  const email = `e2e.recuperacao.${Date.now()}@exemplo.com`;
  const criacao = await admin.request.post('/api/backend/v1/usuarios', {
    headers,
    data: {
      nome: 'E2E Recuperação',
      email,
      perfil: 'ADMINISTRADOR',
      senha: `Inicial-${Date.now()}`,
    },
  });
  expect(criacao.ok(), await criacao.text()).toBe(true);
  const { id } = (await criacao.json()) as { id: string };

  return {
    email,
    encerrar: async () => {
      const fim = await admin.request.post(
        `/api/backend/v1/usuarios/${id}/desativar`,
        { headers },
      );
      expect(fim.ok(), await fim.text()).toBe(true);
      await admin.close();
    },
  };
}

async function pedirLink(page: Page, email: string) {
  const campo = page.getByLabel('E-mail');

  await page.goto('/recuperar-senha');
  // Repete: no `next dev`, o campo aparece antes da hidratação. Só enquanto ele
  // estiver na tela: uma resposta lenta pode chegar depois da espera.
  await expect(async () => {
    if (await campo.isVisible()) {
      await campo.fill(email);
      await page.getByRole('button', { name: 'Enviar link' }).click();
    }
    await expect(page.getByRole('status')).toContainText(MENSAGEM, {
      timeout: 3000,
    });
  }).toPass();
}

// Também em uma falha: a conta de teste não pode continuar ativa no banco.
let encerrarConta: (() => Promise<unknown>) | undefined;

test.afterEach(async () => {
  await encerrarConta?.();
  encerrarConta = undefined;
});

test('pede o link, redefine a senha e entra com a nova', async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const { email, encerrar } = await prepararConta(browser, baseURL as string);
  encerrarConta = encerrar;

  // A partir do login
  await page.goto('/login');
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
  await expect(page).toHaveURL('/recuperar-senha');
  await pedirLink(page, email);

  // O link do e-mail: o token sai da URL assim que a tela abre
  const token = await esperarToken(page.request, email);
  await page.goto(`/redefinir-senha?token=${token}`);
  await expect(page).toHaveURL('/redefinir-senha');
  await expect(page.getByText('Use de 8 a 1024 caracteres.')).toBeVisible();

  // O formulário valida antes de enviar
  const senha = page.getByRole('textbox', { name: 'Nova senha', exact: true });
  const confirmacao = page.getByLabel('Repita a nova senha');
  await expect(async () => {
    await senha.fill(SENHA_NOVA);
    await confirmacao.fill('outra-senha-123');
    await page.getByRole('button', { name: 'Redefinir senha' }).click();
    await expect(page.getByText('As senhas não são iguais')).toBeVisible({
      timeout: 2000,
    });
  }).toPass();

  await confirmacao.fill(SENHA_NOVA);
  await page.getByRole('button', { name: 'Redefinir senha' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Senha redefinida' }),
  ).toBeVisible();

  // Entra com a nova senha
  await page.getByRole('link', { name: 'Ir para o login' }).click();
  await expect(page).toHaveURL('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA_NOVA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();

  // O mesmo link não vale duas vezes: a tela oferece pedir outro
  await page.context().clearCookies();
  await page.goto(`/redefinir-senha?token=${token}`);
  await expect(page).toHaveURL('/redefinir-senha');
  await expect(async () => {
    await senha.fill(SENHA_NOVA);
    await confirmacao.fill(SENHA_NOVA);
    await page.getByRole('button', { name: 'Redefinir senha' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Link inválido' }),
    ).toBeVisible({ timeout: 2000 });
  }).toPass();
  await page.getByRole('link', { name: 'Pedir outro link' }).click();
  await expect(page).toHaveURL('/recuperar-senha');
});

test('a resposta é a mesma para um e-mail que não existe', async ({ page }) => {
  await pedirLink(page, `ninguem.${Date.now()}@exemplo.com`);

  await expect(
    page.getByRole('heading', { level: 1, name: 'Confira seu e-mail' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText(MENSAGEM);
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toBeHidden();
});

test('sem token válido, avisa sem mostrar o formulário', async ({ page }) => {
  for (const caminho of ['/redefinir-senha', '/redefinir-senha?token=curto']) {
    await page.goto(caminho);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Link inválido' }),
    ).toBeVisible();
    await expect(page.getByLabel('Repita a nova senha')).toBeHidden();
    await expect(page).toHaveURL('/redefinir-senha');
  }
});

test('recarregar depois de abrir o link pede outro, porque o token saiu da URL', async ({
  page,
}) => {
  await page.goto(`/redefinir-senha?token=${TOKEN_FICTICIO}`);
  await expect(page).toHaveURL('/redefinir-senha');
  await expect(page.getByLabel('Repita a nova senha')).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Link inválido' }),
  ).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`no tema ${colorScheme}`, () => {
    test.use({ colorScheme, viewport: { width: 360, height: 740 } });

    test('as telas não têm violações e cabem no celular', async ({ page }) => {
      for (const caminho of [
        '/recuperar-senha',
        `/redefinir-senha?token=${TOKEN_FICTICIO}`,
        '/redefinir-senha',
      ]) {
        await page.goto(caminho);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        const excesso = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(excesso).toBeLessThanOrEqual(0);
      }
    });
  });
}
