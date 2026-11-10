import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect, api } from './support/reservas.fixture';
import type { components } from '../src/shared/api/schema';
import type { Paginated } from '../src/shared/api/pagination';
test.skip(
  !process.env.E2E_API_URL || !process.env.E2E_BACKEND_DIR,
  'Requer backend real e banco isolado.',
);
const parent = [
  [-24.7254, -53.7413],
  [-24.7254, -53.7394],
  [-24.724, -53.7394],
  [-24.724, -53.7413],
];
const child = [
  [-24.7252, -53.7411],
  [-24.7252, -53.7407],
  [-24.7248, -53.7407],
  [-24.7248, -53.7411],
];
async function coordenadas(page: Page, vertices: number[][]) {
  await page.getByText('Informar ou editar coordenadas dos vértices').click();
  await page
    .getByLabel('Vértices (latitude, longitude)')
    .fill(vertices.map((v) => v.join(', ')).join('\n'));
  await page.getByRole('button', { name: 'Aplicar coordenadas' }).click();
}
test.beforeEach(async ({ page }) => {
  // Testes não baixam tiles do serviço comunitário.
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
        'base64',
      ),
    }),
  );
});
test('cadastra loteamento e lote por coordenadas, persiste e rejeita sobreposição', async ({
  page,
  request,
}) => {
  const nome = `Área geográfica E2E ${randomUUID().slice(0, 8)}`;
  await page.goto('/loteamentos/novo');
  await page.getByLabel('Nome').fill(nome);
  await page.getByRole('button', { name: 'Demarcar no mapa' }).click();
  await coordenadas(page, parent);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page).toHaveURL(/\/loteamentos\/[0-9a-f-]+$/);
  const id = page.url().split('/').at(-1)!;
  await page.getByLabel(/^Número/).fill('GEO');
  await page
    .getByRole('button', { name: 'Demarcar quadra no mapa', exact: true })
    .click();
  await coordenadas(page, [
    parent[0],
    parent[1],
    [-24.7247, -53.7394],
    [-24.7247, -53.7413],
  ]);
  await page
    .getByRole('button', { name: 'Adicionar quadra', exact: true })
    .click();
  await expect(
    page.getByText('Quadra cadastrada', { exact: true }).first(),
  ).toBeVisible();
  const quadras = await api<Paginated<components['schemas']['QuadraDto']>>(
    request,
    'GET',
    `/loteamentos/${id}/quadras`,
  );
  const quadra = quadras.data[0];
  await page
    .getByRole('button', { name: 'Editar a quadra GEO', exact: true })
    .click();
  const editarQuadra = page.getByRole('dialog');
  await editarQuadra
    .getByRole('button', { name: 'Demarcar quadra no mapa', exact: true })
    .click();
  await editarQuadra
    .getByText('Informar ou editar coordenadas dos vértices')
    .click();
  await expect(
    editarQuadra.getByLabel('Vértices (latitude, longitude)'),
  ).toHaveValue(/-24.7247000/);
  await editarQuadra
    .getByRole('button', { name: 'Aplicar coordenadas' })
    .click();
  await editarQuadra
    .getByRole('button', { name: 'Salvar', exact: true })
    .click();
  await expect(editarQuadra).toBeHidden();
  async function preencher(numero: string) {
    await page.goto('/lotes/novo');
    await page.getByLabel('Loteamento').selectOption(id);
    await page.getByLabel('Quadra').selectOption(quadra.id);
    await page.getByLabel('Número').fill(numero);
    await page.getByLabel('Área (m²)').fill('360');
    await page.getByRole('button', { name: 'Demarcar no mapa' }).click();
    await expect(
      page.getByRole('heading', { name: 'Demarcar área' }),
    ).toBeVisible();
    await coordenadas(page, child);
  }
  await preencher('GEO-01');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page).toHaveURL(/\/lotes$/);
  const areas = await api<
    Paginated<components['schemas']['AreaGeograficaDto']>
  >(request, 'GET', `/geografia/areas?loteamentoId=${id}`);
  const lote = areas.data.find((a) => a.tipo === 'LOTE')!;
  expect(lote.vertices).toEqual(child);
  await page.goto(`/lotes/${lote.id}/editar`);
  await page.getByRole('button', { name: 'Demarcar no mapa' }).click();
  await page.getByText('Informar ou editar coordenadas dos vértices').click();
  await expect(page.getByLabel('Vértices (latitude, longitude)')).toHaveValue(
    child.map((v) => v.map((n) => n.toFixed(7)).join(', ')).join('\n'),
  );
  const ajustado = child.map(([lat, lng]) => [lat + 0.00005, lng]);
  await page
    .getByLabel('Vértices (latitude, longitude)')
    .fill(ajustado.map((v) => v.join(', ')).join('\n'));
  await page.getByRole('button', { name: 'Aplicar coordenadas' }).click();
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page).toHaveURL(/\/lotes$/);
  const editado = await api<components['schemas']['AreaGeograficaDetalheDto']>(
    request,
    'GET',
    `/geografia/areas/${lote.id}`,
  );
  expect(editado.area?.vertices).toEqual(ajustado);
  await preencher('GEO-02');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'outro lote' }),
  ).toBeVisible();
  await page.getByLabel('Vértices (latitude, longitude)').fill(
    [
      [-24.7245, -53.7411],
      [-24.7245, -53.7407],
      [-24.7242, -53.7407],
      [-24.7242, -53.7411],
    ]
      .map((v) => v.join(', '))
      .join('\n'),
  );
  await page.getByRole('button', { name: 'Aplicar coordenadas' }).click();
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'quadra escolhida' }),
  ).toBeVisible();
  await page
    .getByLabel('Vértices (latitude, longitude)')
    .fill(parent.map(([a, b]) => `${a + 0.01}, ${b}`).join('\n'));
  await page.getByRole('button', { name: 'Aplicar coordenadas' }).click();
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'dentro do loteamento' }),
  ).toBeVisible();
  await page.goto('/mapa/geografico');
  await page.getByLabel('Loteamento no mapa').selectOption(id);
  await expect(page.getByText(/1 lotes demarcados/)).toBeVisible();
  await expect(page.locator('.leaflet-interactive')).toHaveCount(3);
  await expect(
    page.locator('.leaflet-tooltip').filter({ hasText: 'Quadra GEO' }),
  ).toBeVisible();
  const contorno = page.locator('.leaflet-interactive').first();
  for (let i = 0; i < 5; i++) {
    const before = await contorno.getAttribute('d');
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await expect(contorno).not.toHaveAttribute('d', before!);
  }
  await expect(
    page.locator('.leaflet-tooltip').filter({ hasText: 'Quadra GEO' }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Enquadrar áreas', exact: true })
    .click();
  await expect(
    page.locator('.leaflet-tooltip').filter({ hasText: 'Quadra GEO' }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await page.locator('.leaflet-interactive').nth(1).boundingBox())
          ?.width ?? 0,
    )
    .toBeGreaterThan(20);
});
test('desenha com mouse e mantém os vértices no editor', async ({ page }) => {
  await page.goto('/loteamentos/novo');
  await page.getByRole('button', { name: 'Demarcar no mapa' }).click();
  const map = page.getByRole('region', { name: 'Mapa geográfico interativo' });
  await expect(map).toBeVisible();
  await map.scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Desenhar área' }).click();
  const box = await map.boundingBox();
  expect(box).not.toBeNull();
  for (const [x, y] of [
    [0.3, 0.3],
    [0.7, 0.3],
    [0.6, 0.7],
  ])
    await page.mouse.click(box!.x + box!.width * x, box!.y + box!.height * y);
  await expect(page.getByText(/3 vértices\./)).toBeVisible();
  await page.getByRole('button', { name: 'Concluir desenho' }).click();
  await page
    .getByRole('button', { name: 'Adicionar ponto entre 1 e 2', exact: true })
    .click();
  await expect(page.getByText(/4 vértices\./)).toBeVisible();
  await page.getByText('Informar ou editar coordenadas dos vértices').click();
  await expect(page.getByLabel('Vértices (latitude, longitude)')).toHaveValue(
    /-24\./,
  );
});
test('mantém o mapa e a consulta por teclado acessíveis no celular', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/mapa/geografico');
  await expect(
    page.getByRole('region', { name: 'Mapa geográfico interativo' }),
  ).toBeVisible();
  await expect(page.getByLabel('Consultar área')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test('a opção Mapa abre diretamente o geográfico e mantém acesso à planta', async ({
  page,
}) => {
  await page.goto('/lotes');
  await page
    .getByRole('navigation', { name: 'Menu principal' })
    .getByRole('link', { name: 'Mapa', exact: true })
    .click();
  await expect(page).toHaveURL(/\/mapa\/geografico$/);
  await expect(
    page.getByRole('heading', { name: 'Mapa geográfico', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Planta por imagem', exact: true })
    .click();
  await expect(page).toHaveURL(/\/mapa$/);
});
