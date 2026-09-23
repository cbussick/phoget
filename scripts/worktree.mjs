import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import { resolve } from "node:path";
import pg from "pg";

const root = resolve(import.meta.dirname, "..");
const id = createHash("sha256").update(root).digest("hex").slice(0, 12);
const file = resolve(root, ".runtime/worktree.json");
const names = { dev: `phoget_dev_${id}`, test: `phoget_test_${id}` };
const command = process.argv[2];
if (!["bootstrap", "run", "clean"].includes(command))
  throw new Error("Usage: node scripts/worktree.mjs bootstrap|run <command...>|clean");
let local;
try {
  local = await readFile(resolve(root, ".env"), "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const template = await readFile(resolve(root, ".env.example"), "utf8");
const source =
  process.env.PHOGET_DATABASE_URL ??
  local?.match(/^DATABASE_URL=(.*)$/m)?.[1] ??
  template.match(/^DATABASE_URL=(.*)$/m)?.[1];
if (!source) throw new Error("Set PHOGET_DATABASE_URL to the local PostgreSQL URL");
const adminUrl = new URL(source);
// Never create or drop databases on a remote/production host.
if (!["127.0.0.1", "localhost"].includes(adminUrl.hostname))
  throw new Error("Only loopback PostgreSQL is supported");
adminUrl.pathname = "/postgres";

async function port() {
  const server = net.createServer();
  await new Promise((ok, fail) => server.once("error", fail).listen(0, "127.0.0.1", ok));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No TCP port allocated");
  await new Promise((ok) => server.close(ok));
  return address.port;
}
async function database(name, drop = false) {
  const client = new pg.Client({ connectionString: adminUrl.href });
  await client.connect();
  try {
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (drop && exists.rowCount) {
      const active = await client.query(
        "SELECT 1 FROM pg_stat_activity WHERE datname = $1 LIMIT 1",
        [name],
      );
      if (active.rowCount)
        throw new Error(`${name} has active connections; stop its servers first`);
      await client.query(`DROP DATABASE "${name}"`);
    } else if (!drop && !exists.rowCount) await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }
}
let runtime;
try {
  runtime = JSON.parse(await readFile(file, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (runtime && (runtime.id !== id || runtime.host !== adminUrl.host))
  throw new Error(
    "Runtime belongs to a different worktree or database host; clean it explicitly first",
  );
if (command === "clean") {
  if (!runtime) throw new Error("No worktree runtime found; refusing cleanup");
  await database(names.test, true);
  await database(names.dev, true);
  console.log(`Removed ${names.dev} and ${names.test}. Runtime ports are retained for reuse.`);
} else {
  if (!runtime) {
    const ports = await Promise.all(Array.from({ length: 5 }, () => port()));
    if (new Set(ports).size !== ports.length)
      throw new Error("Port allocation collision; retry bootstrap");
    runtime = { id, host: adminUrl.host, ports };
    await mkdir(resolve(root, ".runtime"), { recursive: true });
    await writeFile(file, JSON.stringify(runtime, null, 2), { mode: 0o600, flag: "wx" });
  }
  await database(names.dev);
  await database(names.test);
  const [api, web, test, storybook, storybookDev] = runtime.ports;
  const url = (name) => {
    const result = new URL(source);
    result.pathname = `/${name}`;
    return result.href;
  };
  const env = {
    ...process.env,
    DATABASE_URL: url(names.dev),
    PORT: String(api),
    APP_ORIGIN: `http://127.0.0.1:${web}`,
    PHOGET_DEV_PORT: String(web),
    PHOGET_TEST_URL: url(names.test),
    PHOGET_TEST_PORT: String(test),
    PHOGET_STORYBOOK_PORT: String(storybook),
    PHOGET_STORYBOOK_DEV_PORT: String(storybookDev),
    PHOGET_TEST_DATABASE: names.test,
    PHOGET_DEV_DATABASE: names.dev,
  };
  for (const [name, values] of [
    [".env", { DATABASE_URL: url(names.dev), PORT: api, APP_ORIGIN: env.APP_ORIGIN }],
    [
      ".env.test",
      {
        DATABASE_URL: url(names.test),
        PORT: test,
        APP_ORIGIN: `http://127.0.0.1:${test}`,
        PHOGET_TEST_DATABASE: names.test,
        PHOGET_TEST_PORT: test,
        PHOGET_STORYBOOK_PORT: storybook,
      },
    ],
  ]) {
    await writeFile(
      resolve(root, name),
      Object.entries(values)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n") + "\n",
      { mode: 0o600 },
    );
  }
  console.log(
    `Worktree ${id}: dev http://127.0.0.1:${web} (API ${api}), test ${test}, Storybook ${storybook}; databases ${names.dev}, ${names.test}`,
  );
  if (command === "run") {
    const args = process.argv.slice(3);
    if (!args.length) throw new Error("Pass a command after run");
    if (
      (args[0] === "npm" &&
        args[1] === "run" &&
        ["check", "test", "test:e2e", "test:storybook", "gallery:errors", "db:setup:test"].includes(
          args[2],
        )) ||
      (args[0] === "npm" && args[1] === "test")
    )
      env.DATABASE_URL = env.PHOGET_TEST_URL;
    const child = spawn(args[0], args.slice(1), { cwd: root, stdio: "inherit", env });
    for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
    child.once("error", (error) => {
      console.error(error);
      process.exitCode = 1;
    });
    child.once("exit", (code, signal) => {
      process.exitCode = code ?? (signal ? 1 : 0);
    });
  }
}
