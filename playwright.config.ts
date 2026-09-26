import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:8081',
    viewport: { width: 1440, height: 1100 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run web -- --host localhost',
      url: 'http://localhost:8081',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run fixture',
      url: 'http://127.0.0.1:8790/__stats',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run bridge -- --camera http://127.0.0.1:8790 --port 8791',
      url: 'http://127.0.0.1:8791/__bridge',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
