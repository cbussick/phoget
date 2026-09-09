import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  outputDir: "storybook-test-results",
  testDir: "tests",
  testMatch: "storybook.spec.ts",
  workers: 2,
  timeout: 30000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:6007",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "python3 -m http.server 6007 --bind 127.0.0.1 --directory storybook-static",
    url: "http://127.0.0.1:6007",
    reuseExistingServer: false,
  },
});
