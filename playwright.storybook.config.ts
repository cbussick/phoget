import { defineConfig, devices } from "@playwright/test";
const port = process.env.PHOGET_STORYBOOK_PORT;
if (!port) throw new Error("Run Storybook tests via the worktree runtime");
const origin = `http://127.0.0.1:${port}`;
export default defineConfig({
  outputDir: "storybook-test-results",
  testDir: "tests",
  testMatch: "storybook.spec.ts",
  workers: 2,
  timeout: 30000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory storybook-static`,
    url: origin,
    reuseExistingServer: false,
  },
});
