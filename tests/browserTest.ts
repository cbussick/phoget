import { test as base } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export const test = base.extend<{}, { testDatabase: void }>({
  testDatabase: [
    // Playwright requires destructuring even when a fixture has no dependencies.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      // Browser projects run sequentially with one worker and share gather_test.
      // Reset accounts and login limits before each worker, including replacements.
      await run(process.execPath, [
        "--env-file=.env.test",
        "--import",
        "tsx",
        "tests/prepareAccounts.ts",
      ]);
      await use();
    },
    { scope: "worker", auto: true },
  ],
});
