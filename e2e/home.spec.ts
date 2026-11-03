import { expect, test } from '@playwright/test';

test('abre a página inicial e recebe 200', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Urbizzi' })).toBeVisible();
});
