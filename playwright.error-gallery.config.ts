import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "scripts",
  testMatch: "errorGallery.spec.ts",
  workers: 1,
  timeout: 120_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3002",
    extraHTTPHeaders: { "X-Gather-Request": "1" },
  },
  webServer: {
    command: "node --env-file=.env.test dist/server/index.js",
    url: "http://127.0.0.1:3002/api/health",
    reuseExistingServer: false,
  },
});
