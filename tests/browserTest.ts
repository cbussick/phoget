import { test as base } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export const test = base.extend<{ firefoxNavigation: void }, { testDatabase: void }>({
  firefoxNavigation: [
    async ({ context, browserName }, use) => {
      if (browserName === "firefox") {
        // Firefox may render COOP documents without reporting the navigation commit.
        // Preserve production headers and coverage in Chromium/WebKit; only
        // intercept Firefox test document responses, never API responses.
        await context.route("**/*", async (route) => {
          if (route.request().resourceType() !== "document") return route.continue();
          const response = await route.fetch();
          const headers = { ...response.headers() };
          delete headers["cross-origin-opener-policy"];
          await route.fulfill({ response, headers });
        });
      }
      await use();
    },
    { auto: true },
  ],
  testDatabase: [
    // Playwright requires destructuring even when a fixture has no dependencies.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      // One Playwright process and worker per browser; each resets only its own database.
      const browser = workerInfo.project.name.toUpperCase();
      const databaseUrl = process.env[`PHOGET_${browser}_TEST_URL`];
      const port = process.env[`PHOGET_${browser}_TEST_PORT`];
      if (!databaseUrl || !port) throw new Error(`Missing ${browser} test runtime`);
      process.env.PHOGET_TEST_PORT = port;
      await run(
        process.execPath,
        ["--env-file=.env.test", "--import", "tsx", "tests/prepareAccounts.ts"],
        {
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
            PHOGET_TEST_DATABASE: new URL(databaseUrl).pathname.slice(1),
            PHOGET_TEST_PORT: port,
          },
        },
      );
      await use();
    },
    { scope: "worker", auto: true },
  ],
});
