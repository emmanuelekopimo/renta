import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3200;
const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://renta:renta@localhost:5432/renta_test';
// Use the pre-installed Chromium when available (offline containers / CI images).
const localChromium = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOptions = fs.existsSync(localChromium) ? { executablePath: localChromium } : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { DATABASE_URL: TEST_DB, RENTA_TODAY: '2026-10-14', SESSION_SECRET: 'e2e-secret', INSECURE_COOKIES: '1' },
  },
});
