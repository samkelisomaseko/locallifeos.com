import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: 'repaired-modules.spec.mjs',
  timeout: 60000,
  retries: 1,
  workers: 1,
  use: { viewport: { width: 1440, height: 900 } },
  webServer: [
    {
      command: 'node --env-file-if-exists=.env server/serve.mjs',
      url: 'http://localhost:4182',
      reuseExistingServer: !process.env.CI,
      env: { PORT: '4182', DIST_DIR: 'dist' },
      cwd: process.cwd(),
    },
  ],
});
