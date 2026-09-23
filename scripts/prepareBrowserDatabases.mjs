import { spawnSync } from "node:child_process";

for (const browser of ["chromium", "firefox", "webkit"]) {
  const key = `PHOGET_${browser.toUpperCase()}_TEST`;
  const databaseUrl = process.env[`${key}_URL`];
  const port = process.env[`${key}_PORT`];
  if (!databaseUrl || !port) throw new Error(`Run test:e2e through the worktree runtime (${key})`);
  const database = new URL(databaseUrl).pathname.slice(1);
  if (!new RegExp(`^phoget_test_[a-f0-9]{12}_${browser}$`).test(database))
    throw new Error(`Invalid ${browser} test database`);
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    PHOGET_TEST_DATABASE: database,
    PHOGET_TEST_PORT: port,
    PORT: port,
    APP_ORIGIN: `http://127.0.0.1:${port}`,
  };
  for (const args of [
    ["node_modules/drizzle-kit/bin.cjs", "push"],
    ["--import", "tsx", "server/db/setup.ts"],
  ]) {
    const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
