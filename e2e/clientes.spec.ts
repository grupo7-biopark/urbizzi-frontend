import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { formatarCpf, gerarCpf } from './support/documento';

// O fluxo principal também roda contra o backend real, com E2E_API_URL, E2E_EMAIL e
// E2E_SENHA. Os dados são fictícios e ficam no banco: a API não remove clientes.
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const SEM_API_FALSA = !!process.env.E2E_API_URL;

function sufixo() {
  return `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
}

/** Repete se o clique chegar antes da hidratação, que no `next dev` frio demora. */
async function entrar(page: Page, email = EMAIL) {
  await page.goto('/login');
  await expect(async () => {
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible({
      timeout: 5000,
    });
  }).toPass({ timeout: 30_000 });
}

function campo(page: Page, nome: string) {
  return page.getByRole('textbox', { name: nome, exact: true });
}

/** Preenche e salva, repetindo se o clique chegar antes da hidratação. */
async function salvarNovo(page: Page, nome: string, cpf: string) {
  await page.goto('/clientes/novo');
  await campo(page, 'Nome').fill(nome);
  await campo(page, 'CPF ou CNPJ').fill(cpf);
  await page.getByRole('button', { name: 'Salvar' }).click();
}

async function buscar(page: Page, texto: string) {
  const busca = page.getByRole('searchbox', {
    name: 'Buscar por nome ou CPF/CNPJ',
  });

  await busca.fill(texto);
}

test('cadastra, busca por nome e documento, edita e recusa o documento repetido', async ({
  page,
}) => {
  test.slow();
  const id = sufixo();
  const nome = `Cliente E2E Ação ${id}`;
  const cpf = gerarCpf();
  await entrar(page);

  // CPF inválido: recusado antes de enviar
  await page.goto('/clientes/novo');
  await expect(async () => {
    await campo(page, 'Nome').fill(nome);
    await campo(page, 'CPF ou CNPJ').fill('52998224724');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('CPF inválido')).toBeVisible({
      timeout: 2000,
    });
  }).toPass();
  await expect(page).toHaveURL(/\/clientes\/novo$/);

  // Cadastro, com a máscara no campo
  await campo(page, 'CPF ou CNPJ').fill(cpf);
  await expect(campo(page, 'CPF ou CNPJ')).toHaveValue(formatarCpf(cpf));
  await campo(page, 'Telefone').fill('45999998888');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]{36}\/editar$/);
  await expect(
    page.getByRole('heading', { level: 1, name: nome }),
  ).toBeVisible();
  const cadastroUrl = page.url();

  // Busca por nome parcial sem acento e pelo documento, com e sem máscara.
  // Nada disso vai para a URL (LGPD).
  await page.goto('/clientes');
  for (const texto of [`e2e acao ${id}`, formatarCpf(cpf), cpf]) {
    await buscar(page, texto);
    await expect(
      page.getByRole('link', { name: nome, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /^Cliente E2E/ })).toHaveCount(
      1,
    );
    expect(page.url()).not.toContain(cpf.slice(0, 3));
    expect(page.url()).not.toContain('acao');
  }

  // Edição
  await page.getByRole('link', { name: nome, exact: true }).click();
  await expect(campo(page, 'Telefone')).toHaveValue('(45) 99999-8888');
  await campo(page, 'E-mail').fill(`cliente.${id}@exemplo.com`);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(
    page.getByText('Cliente atualizado', { exact: true }),
  ).toBeVisible();
  await page.goto(cadastroUrl);
  await expect(campo(page, 'E-mail')).toHaveValue(`cliente.${id}@exemplo.com`);

  // Documento repetido: mensagem e link para o cadastro existente
  await salvarNovo(page, `Outro E2E ${id}`, cpf);
  await expect(
    page.getByText('Já existe um cliente com esse documento'),
  ).toBeVisible();
  await page.getByRole('link', { name: `Abrir o cadastro de ${nome}` }).click();
  await expect(page).toHaveURL(cadastroUrl);
});

test.describe('com os usuários da API falsa', () => {
  test.skip(SEM_API_FALSA, 'Depende dos usuários da API falsa.');

  test('o perfil Consulta recebe 403 e não chega a ver os dados', async ({
    page,
  }) => {
    await entrar(page, 'consulta@exemplo.com');

    const resposta = await page.goto('/clientes');

    expect(resposta?.status()).toBe(403);
    const lista = await page.request.get(
      '/api/backend/v1/clientes?page=1&pageSize=20',
    );
    expect(lista.status()).toBe(403);
  });

  test('o Comercial cadastra clientes', async ({ page }) => {
    const nome = `Cliente Comercial ${sufixo()}`;
    await entrar(page, 'comercial@exemplo.com');

    await expect(async () => {
      await salvarNovo(page, nome, gerarCpf());
      await expect(page).toHaveURL(/\/editar$/, { timeout: 3000 });
    }).toPass();

    await expect(
      page.getByRole('heading', { level: 1, name: nome }),
    ).toBeVisible();
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`no tema ${colorScheme}`, () => {
      test.use({ colorScheme });

      test('as telas não têm violações e cabem no celular', async ({
        page,
      }) => {
        await page.setViewportSize({ width: 360, height: 740 });
        await entrar(page);

        for (const url of ['/clientes', '/clientes/novo']) {
          await page.goto(url);
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
});
