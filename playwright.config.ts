import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:3001';
const FAKE_API_URL = 'http://localhost:3999';

// Sem E2E_API_URL, sobe a API falsa: é o caso do CI, que não tem o backend real.
const realApiUrl = process.env.E2E_API_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // No CI, `list` também: se o job for cancelado, o relatório não chega a ser publicado.
  reporter: process.env.CI ? [['list'], ['html']] : 'html',
  // O `next dev` compila cada rota no primeiro acesso, o que passa dos 5 s padrão.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    ...(realApiUrl
      ? []
      : [
          {
            command: 'node e2e/support/fake-api.mjs',
            url: `${FAKE_API_URL}/health`,
            reuseExistingServer: !process.env.CI,
          },
        ]),
    {
      command: 'npm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      env: {
        API_URL: realApiUrl ?? FAKE_API_URL,
        NEXT_PUBLIC_APP_URL: baseURL,
      },
    },
  ],
});
