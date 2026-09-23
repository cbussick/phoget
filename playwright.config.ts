import { defineConfig, devices } from "@playwright/test";
const port = process.env.PHOGET_TEST_PORT;
if (!port) throw new Error("Run browser tests via node scripts/worktree.mjs run npm run test:e2e");
const origin = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "tests",
  testMatch: "*.spec.ts",
  testIgnore: "storybook.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 8000 },
  use: {
    extraHTTPHeaders: { "X-Phoget-Request": "1" },
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      command: "node --env-file=.env.test dist/server/index.js",
      env: {
        DATABASE_URL: process.env.PHOGET_TEST_URL!,
        PORT: port,
        APP_ORIGIN: origin,
        NODE_ENV: "production",
      },
      url: `${origin}/api/health`,
      reuseExistingServer: false,
    },
  ],
});
