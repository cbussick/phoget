import { defineConfig, devices } from "@playwright/test";

const port = process.env.PHOGET_TEST_PORT;
if (!port) throw new Error("Run gallery via the worktree runtime");
const origin = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "scripts",
  testMatch: "errorGallery.spec.ts",
  workers: 1,
  timeout: 120_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: origin,
    extraHTTPHeaders: { "X-Phoget-Request": "1" },
  },
  webServer: {
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
});
