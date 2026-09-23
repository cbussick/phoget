import { defineConfig, devices } from "@playwright/test";
if (
  !process.env.PHOGET_TEST_PORT ||
  !["chromium", "firefox", "webkit"].includes(process.env.PHOGET_BROWSER_PROJECT ?? "")
)
  throw new Error("Run browser tests via node scripts/worktree.mjs run npm run test:e2e");
const browsers = ["chromium", "firefox", "webkit"] as const;
const environments = browsers.map((name) => {
  const key = `PHOGET_${name.toUpperCase()}_TEST`;
  const databaseUrl = process.env[`${key}_URL`];
  const browserPort = process.env[`${key}_PORT`];
  if (!databaseUrl || !browserPort) throw new Error(`Missing ${key} worktree runtime`);
  return { name, databaseUrl, port: browserPort, origin: `http://127.0.0.1:${browserPort}` };
});
export default defineConfig({
  testDir: "tests",
  outputDir: `test-results/${process.env.PHOGET_BROWSER_PROJECT ?? "all"}`,
  testMatch: "*.spec.ts",
  testIgnore: "storybook.spec.ts",
  fullyParallel: false,
  // Each browser runs in its own Playwright process with one worker per database.
  workers: 1,
  timeout: 60000,
  expect: { timeout: 8000 },
  use: {
    extraHTTPHeaders: { "X-Phoget-Request": "1" },
    baseURL: environments[0].origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: environments.map(({ name, origin }) => ({
    name,
    use: {
      ...devices[
        { chromium: "Desktop Chrome", firefox: "Desktop Firefox", webkit: "Desktop Safari" }[name]
      ],
      baseURL: origin,
    },
  })),
  webServer: environments
    .filter(({ name }) => name === process.env.PHOGET_BROWSER_PROJECT)
    .map(({ databaseUrl, port: browserPort, origin }) => ({
      command: "node --env-file=.env.test dist/server/index.js",
      env: {
        DATABASE_URL: databaseUrl,
        PORT: browserPort,
        APP_ORIGIN: origin,
        NODE_ENV: "production",
      },
      url: `${origin}/api/health`,
      reuseExistingServer: false,
    })),
});
