import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// A API falsa (e2e/support/fake-api.mjs) avança o status sozinha, em poucos segundos.
test.skip(
  !!process.env.E2E_API_URL,
  'Usa os usuários e o processamento simulado da API falsa.',
);

// O `next dev` compila cada rota no primeiro acesso, e o processamento simulado leva segundos.
test.describe.configure({ timeout: 60_000 });

const SENHA = 'senha-de-teste-123';
const MB = 1024 * 1024;

// Assinatura de um PNG: basta para o nome e o tipo. A API falsa não lê a imagem.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makeArquivo(name: string, tamanho = PNG.length) {
  return {
    name,
    mimeType: 'image/png',
    buffer: Buffer.concat([PNG, Buffer.alloc(tamanho - PNG.length)]),
  };
}

async function entrar(page: Page, email = 'gestor@exemplo.com') {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

async function abrirFormulario(page: Page) {
  await page.goto('/plantas/nova');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Enviar planta' }),
  ).toBeVisible();
}

function linhaDa(page: Page, nome: string) {
  return page.getByRole('row').filter({ hasText: nome });
}

/** Nome único: as plantas ficam na API falsa até o fim da execução. */
function makeNome(descricao: string) {
  return `${descricao} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Repete a seleção: no `next dev`, o campo aparece antes da hidratação, e o evento
 * se perde. O resumo dos arquivos na tela confirma que o formulário já reage. Por
 * isso, selecione antes de preencher o nome, e o clique em enviar não precisa de
 * repetição, que duplicaria o envio.
 */
async function selecionarArquivos(
  page: Page,
  arquivos: ReturnType<typeof makeArquivo> | ReturnType<typeof makeArquivo>[],
) {
  await expect(async () => {
    await page.getByLabel('Arquivos').setInputFiles(arquivos);
    await expect(page.getByText(/Tamanho( total)?:/)).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
}

async function enviarFormulario(page: Page) {
  await page.getByRole('button', { name: 'Enviar planta' }).click();
  await expect(page).toHaveURL('/plantas');
}

test('envia uma imagem pequena, acompanha até ficar pronta e ativa', async ({
  page,
}) => {
  const nome = makeNome('Imagem pequena');
  await entrar(page);
  await abrirFormulario(page);

  await selecionarArquivos(page, makeArquivo('planta.png'));
  await page.getByLabel('Nome').fill(nome);
  await enviarFormulario(page);

  const linha = linhaDa(page, nome);
  await expect(linha.getByText('Processando')).toBeVisible();
  // Sem recarregar a página: a lista se atualiza sozinha.
  await expect(linha.getByText('Pronta')).toBeVisible();

  await linha.getByRole('button', { name: /^Ativar a versão/ }).click();
  await page.getByRole('button', { name: 'Ativar planta' }).click();

  await expect(linha.getByText('Ativa', { exact: true })).toBeVisible();
  await expect(
    linha.getByRole('button', { name: /^Ativar a versão/ }),
  ).toBeHidden();
});

test('um arquivo acima de 10 MB passa pelo proxy, que o repassa em fluxo', async ({
  page,
}) => {
  const nome = makeNome('Arquivo grande');
  await entrar(page);
  await abrirFormulario(page);

  await selecionarArquivos(page, makeArquivo('planta.png', 11 * MB));
  await page.getByLabel('Nome').fill(nome);
  await enviarFormulario(page);

  await expect(linhaDa(page, nome)).toBeVisible();
});

test('avisa a grade incompleta antes de enviar e não envia', async ({
  page,
}) => {
  const envios: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/v1/plantas')) {
      envios.push(request.url());
    }
  });
  await entrar(page);
  await abrirFormulario(page);

  await selecionarArquivos(page, [
    makeArquivo('fatia_01_01.png'),
    makeArquivo('fatia_01_02.png'),
    makeArquivo('fatia_02_01.png'),
  ]);
  await page.getByLabel('Nome').fill(makeNome('Grade incompleta'));

  await expect(
    page.getByText('A grade 2 x 2 está incompleta. Faltam: fatia_02_02.'),
  ).toBeVisible();
  await expect(page.getByText('Grade 2 x 2: 3 de 4 fatias')).toBeVisible();

  await page.getByRole('button', { name: 'Enviar planta' }).click();
  await expect(
    page.getByText('Corrija os problemas dos arquivos antes de enviar'),
  ).toBeVisible();
  await expect(page).toHaveURL('/plantas/nova');
  expect(envios).toEqual([]);
});

test('envia a grade completa de fatias', async ({ page }) => {
  const nome = makeNome('Grade completa');
  await entrar(page);
  await abrirFormulario(page);

  await selecionarArquivos(page, [
    makeArquivo('fatia_01_01.png'),
    makeArquivo('fatia_01_02.png'),
    makeArquivo('fatia_02_01.png'),
    makeArquivo('fatia_02_02.png'),
  ]);
  await page.getByLabel('Nome').fill(nome);
  await expect(page.getByText('Grade 2 x 2: 4 de 4 fatias')).toBeVisible();
  await enviarFormulario(page);

  await expect(linhaDa(page, nome).getByText('2 x 2')).toBeVisible();
});

test('exibe o erro no processamento com a mensagem', async ({ page }) => {
  const nome = makeNome('Planta com falha');
  await entrar(page);
  await abrirFormulario(page);

  await selecionarArquivos(page, makeArquivo('planta.png'));
  await page.getByLabel('Nome').fill(nome);
  await enviarFormulario(page);

  const linha = linhaDa(page, nome);
  await expect(linha.getByText('Erro', { exact: true })).toBeVisible();
  await expect(
    linha.getByText(
      'Não foi possível processar a planta. Envie os arquivos novamente.',
    ),
  ).toBeVisible();
  await expect(linha.getByRole('button', { name: /^Ativar/ })).toBeHidden();
});

test('mostra o progresso em uma conexão lenta e permite cancelar', async ({
  page,
  context,
}) => {
  const nome = makeNome('Envio cancelado');
  await entrar(page);
  await abrirFormulario(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: 256 * 1024,
  });

  await selecionarArquivos(page, makeArquivo('planta.png', 8 * MB));
  await page.getByLabel('Nome').fill(nome);

  const progresso = page.getByRole('progressbar', {
    name: 'Progresso do envio',
  });
  await page.getByRole('button', { name: 'Enviar planta' }).click();
  await expect(progresso).toBeVisible();
  await expect
    .poll(() => progresso.evaluate((barra: HTMLProgressElement) => barra.value))
    .toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Cancelar envio' }).click();

  await expect(
    page.getByText('Envio cancelado', { exact: true }),
  ).toBeVisible();
  await expect(progresso).toBeHidden();
  await expect(page).toHaveURL('/plantas/nova');

  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await page.goto('/plantas');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Plantas' }),
  ).toBeVisible();
  await expect(page.getByText(nome)).toBeHidden();
});

test('Comercial não acessa o envio de planta', async ({ page }) => {
  await entrar(page, 'comercial@exemplo.com');

  const resposta = await page.goto('/plantas/nova');

  expect(resposta?.status()).toBe(403);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Acesso negado' }),
  ).toBeVisible();
});

test.describe('no celular', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('a grade de 10 colunas não cria rolagem horizontal', async ({
    page,
  }) => {
    await entrar(page);
    await abrirFormulario(page);

    await selecionarArquivos(page, [
      makeArquivo('fatia_01_01.png'),
      makeArquivo('fatia_02_10.png'),
    ]);
    await expect(page.getByText('Grade 2 x 10: 2 de 20 fatias')).toBeVisible();

    const excesso = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(excesso).toBeLessThanOrEqual(0);
  });
});

test.describe('acessibilidade', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`no tema ${colorScheme}`, () => {
      test.use({ colorScheme });

      test('a lista e o formulário não têm violações', async ({ page }) => {
        const nome = makeNome('Acessibilidade');
        await entrar(page);
        await abrirFormulario(page);

        await selecionarArquivos(page, [
          makeArquivo('fatia_01_01.png'),
          makeArquivo('fatia_02_02.png'),
        ]);
        await page.getByLabel('Nome').fill(nome);
        await expect(page.getByText('Falta').first()).toBeVisible();
        const formulario = await new AxeBuilder({ page }).analyze();
        expect(formulario.violations).toEqual([]);

        await selecionarArquivos(page, makeArquivo('planta.png'));
        await enviarFormulario(page);
        await expect(linhaDa(page, nome).getByText('Pronta')).toBeVisible();

        const lista = await new AxeBuilder({ page }).analyze();
        expect(lista.violations).toEqual([]);
      });
    });
  }
});
