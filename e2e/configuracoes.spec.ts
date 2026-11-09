import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// O fluxo principal também roda contra o backend real, com E2E_API_URL, E2E_EMAIL e
// E2E_SENHA (um Administrador), e devolve os prazos ao valor de antes.
const EMAIL = process.env.E2E_EMAIL ?? 'pessoa@exemplo.com';
const SENHA = process.env.E2E_SENHA ?? 'senha-de-teste-123';
const SEM_API_FALSA = !!process.env.E2E_API_URL;

type Prazos = { prazoReservaDias: number; prazoAnaliseDiasUteis: number };

async function entrar(page: Page, email = EMAIL) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

async function lerPrazos(page: Page): Promise<Prazos> {
  const resposta = await page.request.get(
    '/api/backend/v1/configuracoes?page=1&pageSize=100',
  );
  const { data } = (await resposta.json()) as {
    data: { chave: string; valor: number }[];
  };
  const valor = (chave: string) =>
    data.find((item) => item.chave === chave)?.valor ?? 7;

  return {
    prazoReservaDias: valor('prazo_reserva_dias'),
    prazoAnaliseDiasUteis: valor('prazo_analise_dias_uteis'),
  };
}

function campoDaReserva(page: Page) {
  return page.getByRole('textbox', { name: /Prazo da reserva/ });
}

async function abrir(page: Page) {
  await page.goto('/configuracoes');
  await expect(campoDaReserva(page)).toBeVisible();
}

test('altera o prazo da reserva, que volta igual ao recarregar e na API', async ({
  page,
}) => {
  await entrar(page);
  const antes = await lerPrazos(page);
  const novo = antes.prazoReservaDias === 12 ? 13 : 12;

  try {
    await abrir(page);
    await expect(campoDaReserva(page)).toHaveValue(
      String(antes.prazoReservaDias),
    );

    // Inválido: recusado antes de enviar
    await expect(async () => {
      await campoDaReserva(page).fill('0');
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByText('Use pelo menos 1 dia')).toBeVisible({
        timeout: 2000,
      });
    }).toPass();
    expect((await lerPrazos(page)).prazoReservaDias).toBe(
      antes.prazoReservaDias,
    );

    await campoDaReserva(page).fill(String(novo));
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(
      page.getByText('Configurações salvas', { exact: true }),
    ).toBeVisible();

    expect(await lerPrazos(page)).toEqual({ ...antes, prazoReservaDias: novo });
    await page.reload();
    await expect(campoDaReserva(page)).toHaveValue(String(novo));
  } finally {
    // Não deixa uma regra de negócio mudada no banco depois do teste.
    const volta = await page.request.patch('/api/backend/v1/configuracoes', {
      headers: { origin: new URL(page.url()).origin },
      data: antes,
    });
    expect(volta.ok(), await volta.text()).toBe(true);
  }
});

test.describe('com os usuários da API falsa', () => {
  test.skip(SEM_API_FALSA, 'Depende dos usuários da API falsa.');

  for (const email of ['gestor@exemplo.com', 'comercial@exemplo.com']) {
    test(`${email} não acessa as configurações`, async ({ page }) => {
      await entrar(page, email);

      const resposta = await page.goto('/configuracoes');

      expect(resposta?.status()).toBe(403);
    });
  }

  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`no tema ${colorScheme}`, () => {
      test.use({ colorScheme });

      test('a tela não tem violações e cabe no celular', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 740 });
        await entrar(page);
        await abrir(page);

        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        const excesso = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(excesso).toBeLessThanOrEqual(0);
      });
    });
  }
});
