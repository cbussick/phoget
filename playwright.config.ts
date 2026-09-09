import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "*.spec.ts",
  testIgnore: "storybook.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 8000 },
  use: {
    extraHTTPHeaders: { "X-Gather-Request": "1" },
    baseURL: "http://127.0.0.1:3002",
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
      url: "http://127.0.0.1:3002/api/health",
      reuseExistingServer: false,
    },
    {
      command: "python3 -m http.server 4174 --bind 127.0.0.1",
      url: "http://127.0.0.1:4174/prototype/all-lists.html",
      reuseExistingServer: false,
    },
  ],
});
