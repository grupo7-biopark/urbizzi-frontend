import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
if (existsSync('.env.e2e.local')) process.loadEnvFile('.env.e2e.local');
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
const FAKE_API_URL = 'http://localhost:3999';
const realApiUrl = process.env.E2E_API_URL || undefined;
const prepararReal = !!(
  realApiUrl &&
  process.env.E2E_BACKEND_DIR &&
  process.env.DATABASE_URL
);
const reutilizar = !process.env.CI && process.env.E2E_REUSE_SERVERS === 'true';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html']] : 'html',
  expect: { timeout: 15000 },
  globalSetup: prepararReal
    ? './e2e/support/preparar-reservas-real.mjs'
    : undefined,
  use: {
    baseURL,
    trace: 'on-first-retry',
    ...(prepararReal ? { storageState: 'e2e/.auth/gestor.json' } : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    ...(realApiUrl
      ? []
      : [
          {
            command: 'node e2e/support/fake-api.mjs',
            url: `${FAKE_API_URL}/health`,
            reuseExistingServer: reutilizar,
          },
        ]),
    {
      command:
        process.env.E2E_USAR_BUILD === 'true'
          ? 'node e2e/support/servir-build.mjs'
          : `npx next dev${process.env.E2E_USAR_WEBPACK === 'true' ? ' --webpack' : ''} --port ${new URL(baseURL).port || '3001'}`,
      url: baseURL,
      reuseExistingServer: reutilizar,
      env: {
        API_URL: realApiUrl ?? FAKE_API_URL,
        NEXT_PUBLIC_APP_URL: baseURL,
      },
    },
  ],
});
