import { test as base } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export const test = base.extend<{ testDatabase: void }>({
  testDatabase: [
    // Playwright requires destructuring even when a fixture has no dependencies.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      // One worker per browser; reset its database before every test, not once per worker.
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
    { auto: true },
  ],
});
