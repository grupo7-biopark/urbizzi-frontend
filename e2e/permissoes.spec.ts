import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Usa um usuário de cada perfil, que só a API falsa tem (e2e/support/fake-api.mjs).
test.skip(
  !!process.env.E2E_API_URL,
  'O backend real não tem um usuário de cada perfil para o e2e.',
);

const SENHA = 'senha-de-teste-123';

const ROTAS = {
  Início: '/',
  Mapa: '/mapa',
  Loteamentos: '/loteamentos',
  Lotes: '/lotes',
  Clientes: '/clientes',
  Reservas: '/reservas',
  Propostas: '/propostas',
  Pendências: '/propostas/pendencias',
  'Links públicos': '/links-publicos',
  Histórico: '/historico',
  Usuários: '/usuarios',
  Configurações: '/configuracoes',
};

type Tela = keyof typeof ROTAS;

const TELAS = Object.keys(ROTAS) as Tela[];

const CONSULTA: Tela[] = ['Início', 'Mapa', 'Loteamentos', 'Lotes'];
const COMERCIAL: Tela[] = [
  ...CONSULTA,
  'Clientes',
  'Reservas',
  'Propostas',
  'Links públicos',
  'Histórico',
];
const GESTOR: Tela[] = [
  ...CONSULTA,
  'Clientes',
  'Reservas',
  'Propostas',
  'Pendências',
  'Links públicos',
  'Histórico',
];

const PERFIS: { nome: string; email: string; rotulo: string; telas: Tela[] }[] =
  [
    {
      nome: 'Administrador',
      email: 'pessoa@exemplo.com',
      rotulo: 'Administrador',
      telas: TELAS,
    },
    {
      nome: 'Gestor',
      email: 'gestor@exemplo.com',
      rotulo: 'Gestor',
      telas: GESTOR,
    },
    {
      nome: 'Comercial',
      email: 'comercial@exemplo.com',
      rotulo: 'Comercial',
      telas: COMERCIAL,
    },
    {
      nome: 'Consulta',
      email: 'consulta@exemplo.com',
      rotulo: 'Consulta',
      telas: CONSULTA,
    },
  ];

async function entrar(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

function menu(page: Page) {
  return page.getByRole('navigation', { name: 'Menu principal' });
}

/** Repete o clique: no `next dev`, o botão aparece antes da hidratação. */
async function abrirGaveta(page: Page) {
  const gaveta = page.getByRole('dialog', { name: 'Menu' });

  await expect(async () => {
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(gaveta).toBeVisible({ timeout: 1000 });
  }).toPass();

  return gaveta;
}

for (const { nome, email, rotulo, telas } of PERFIS) {
  test.describe(nome, () => {
    test('vê no menu e no cabeçalho só o que corresponde ao perfil', async ({
      page,
    }) => {
      await entrar(page, email);

      await expect(menu(page).getByRole('link')).toHaveText(telas);
      await expect(
        page.getByRole('banner').getByText(rotulo, { exact: true }),
      ).toBeVisible();
    });

    test('acessa as telas permitidas e recebe 403 nas proibidas', async ({
      page,
    }) => {
      test.slow();
      await entrar(page, email);

      for (const tela of TELAS) {
        const resposta = await page.goto(ROTAS[tela]);
        const permitida = telas.includes(tela);

        expect(resposta?.status(), tela).toBe(permitida ? 200 : 403);
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: permitida ? tela : 'Acesso negado',
          }),
        ).toBeVisible();
        // A tela proibida mantém o menu, para a pessoa seguir usando o sistema.
        await expect(menu(page)).toBeVisible();
      }
    });
  });
}

test('um 403 da API chega ao navegador, mesmo pelo proxy', async ({ page }) => {
  await entrar(page, 'consulta@exemplo.com');

  const resposta = await page.evaluate(async () => {
    const response = await fetch('/api/backend/v1/usuarios');
    const body = (await response.json()) as { code: string };
    return { status: response.status, code: body.code };
  });

  expect(resposta).toEqual({ status: 403, code: 'ACESSO_NEGADO' });
});

test('navegar pelo menu leva à tela e marca o item atual', async ({ page }) => {
  await entrar(page, 'gestor@exemplo.com');

  await menu(page).getByRole('link', { name: 'Pendências' }).click();

  await expect(page).toHaveURL('/propostas/pendencias');
  await expect(page).toHaveTitle('Pendências | Urbizzi');
  await expect(
    menu(page).getByRole('link', { name: 'Pendências' }),
  ).toHaveAttribute('aria-current', 'page');

  const trilha = page.getByRole('navigation', { name: 'Trilha de navegação' });
  await trilha.getByRole('link', { name: 'Propostas' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Propostas' }),
  ).toBeVisible();
});

test.describe('barra lateral', () => {
  // A barra é escura nos dois temas: confere o tema claro, em que o erro apareceria.
  test.use({ colorScheme: 'light' });

  test('fica preta com o logo branco, mesmo com a página no tema claro', async ({
    page,
  }) => {
    await entrar(page, 'pessoa@exemplo.com');

    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    const barra = page.getByRole('complementary');

    await expect(barra).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await expect(barra.getByRole('img', { name: /Urbizzi/ })).toHaveAttribute(
      'src',
      /white/,
    );
    await expect(menu(page).getByRole('link', { name: 'Início' })).toHaveCSS(
      'background-color',
      'rgb(238, 96, 23)',
    );
  });
});

test.describe('no celular', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('o menu fica recolhido, abre na gaveta e fecha ao navegar', async ({
    page,
  }) => {
    await entrar(page, 'comercial@exemplo.com');
    await expect(menu(page)).toBeHidden();

    const gaveta = await abrirGaveta(page);
    await gaveta.getByRole('link', { name: 'Reservas' }).click();

    await expect(page).toHaveURL('/reservas');
    await expect(gaveta).toBeHidden();

    const excesso = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(excesso).toBeLessThanOrEqual(0);
  });
});

test('uma rota inexistente mostra a página 404 da marca', async ({ page }) => {
  await entrar(page, 'pessoa@exemplo.com');

  const resposta = await page.goto('/rota-que-nao-existe');

  expect(resposta?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { name: 'Página não encontrada' }),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: 'Urbizzi' })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar ao início' }).click();
  await expect(page).toHaveURL('/');
});

test.describe('acessibilidade', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`no tema ${colorScheme}`, () => {
      test.use({ colorScheme });

      test('as telas internas e a 403 não têm violações', async ({ page }) => {
        await entrar(page, 'consulta@exemplo.com');

        for (const [rota, titulo] of [
          ['/', 'Início'],
          ['/usuarios', 'Acesso negado'],
        ] as const) {
          await page.goto(rota);
          // A resposta 403 vem sem conteúdo no HTML: o Next monta a tela no navegador.
          await expect(
            page.getByRole('heading', { level: 1, name: titulo }),
          ).toBeVisible();
          const { violations } = await new AxeBuilder({ page }).analyze();
          expect(violations, rota).toEqual([]);
        }
      });

      test('a gaveta do celular não tem violações', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 740 });
        await entrar(page, 'pessoa@exemplo.com');

        await abrirGaveta(page);

        const { violations } = await new AxeBuilder({ page }).analyze();
        expect(violations).toEqual([]);
      });
    });
  }
});
