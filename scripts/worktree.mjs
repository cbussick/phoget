import { logger } from "../shared/logging.ts";
import { createHash, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import { resolve } from "node:path";
import pg from "pg";

const root = resolve(import.meta.dirname, "..");
const id = createHash("sha256").update(root).digest("hex").slice(0, 12);
const file = resolve(root, ".runtime/worktree.json");
const browsers = ["chromium", "firefox", "webkit"];
const names = { dev: `phoget_dev_${id}`, test: `phoget_test_${id}` };
const browserName = (browser) => `${names.test}_${browser}`;
const command = process.argv[2];
if (!["bootstrap", "run", "clean"].includes(command)) {
  throw new Error("Usage: node scripts/worktree.mjs bootstrap|run <command...>|clean");
}
const commandArgs = process.argv.slice(3);
if (command === "run" && !commandArgs.length) {
  throw new Error("Pass a command after run");
}
const project = `phoget-worktree-${id}`;

async function port() {
  const server = net.createServer();
  await new Promise((ok, fail) => {
    server.once("error", fail).listen(0, "127.0.0.1", ok);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("No TCP port allocated");
  }
  await new Promise((ok) => {
    server.close(ok);
  });
  return address.port;
}
const databases = [names.dev, names.test, ...browsers.map(browserName)];
let runtime;
try {
  runtime = JSON.parse(await readFile(file, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}
if (runtime && runtime.id !== id) {
  throw new Error("Runtime belongs to a different worktree; refusing to use it");
}
if (command === "bootstrap" && (!runtime || runtime.host)) {
  const previous = runtime;
  const ports = previous?.ports ?? [];
  const extra = await Promise.all(Array.from({ length: 8 - ports.length }, () => port()));
  if (new Set([...ports, ...extra]).size !== 8) {
    throw new Error("Port allocation collision; retry bootstrap");
  }
  runtime = { id, ports: [...ports, ...extra], dbPassword: randomBytes(24).toString("hex") };
  await mkdir(resolve(root, ".runtime"), { recursive: true });
  await writeFile(file, JSON.stringify(runtime, null, 2), {
    mode: 0o600,
    flag: previous ? "w" : "wx",
  });
  if (previous) {
    logger.log("Switching to isolated PostgreSQL. The old shared databases are unchanged.");
  }
}
if (!runtime?.dbPassword || runtime.ports.length !== 8) {
  throw new Error("No isolated worktree runtime found; run bootstrap first");
}

function compose(...args) {
  const result = spawnSync(
    "docker",
    ["compose", "-f", "compose.worktree.yaml", "-p", project, ...args],
    {
      cwd: root,
      env: { ...process.env, PHOGET_WORKTREE_DB_PASSWORD: runtime.dbPassword },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Docker Compose ${args[0]} failed for ${project}`);
  }
  return result.stdout.trim();
}

function databaseUrls() {
  if (!compose("ps", "--status", "running", "-q", "db")) {
    throw new Error("Worktree PostgreSQL is not running; run bootstrap first");
  }
  const address = compose("port", "db", "5432");
  if (!/^127\.0\.0\.1:\d+$/.test(address)) {
    throw new Error("Worktree PostgreSQL must publish a single loopback port");
  }
  return (name) => `postgresql://phoget:${runtime.dbPassword}@${address}/${name}`;
}

async function withDatabase(url, action) {
  const client = new pg.Client({ connectionString: url("postgres") });
  await client.connect();
  try {
    await action(client);
  } finally {
    await client.end();
  }
}

if (command === "clean") {
  if (compose("ps", "--status", "running", "-q", "db")) {
    await withDatabase(databaseUrls(), async (client) => {
      const active = await client.query(
        "SELECT 1 FROM pg_stat_activity WHERE backend_type = 'client backend' AND pid <> pg_backend_pid() LIMIT 1",
      );
      if (active.rowCount) {
        throw new Error("Worktree PostgreSQL has active connections; stop its servers first");
      }
    });
  }
  compose("down", "--volumes");
  logger.log(`Removed ${project} PostgreSQL container and volume. App ports are retained.`);
} else {
  if (command === "bootstrap") {
    compose("up", "-d", "--wait", "db");
  }
  const url = databaseUrls();
  if (command === "bootstrap") {
    await withDatabase(url, async (client) => {
      for (const name of databases) {
        const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
        if (!exists.rowCount) {
          await client.query(`CREATE DATABASE "${name}"`);
        }
      }
    });
  }
  const [api, web, test, storybook, storybookDev, ...browserPorts] = runtime.ports;
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
    ...Object.fromEntries(
      browsers.flatMap((browser, index) => [
        [`PHOGET_${browser.toUpperCase()}_TEST_URL`, url(browserName(browser))],
        [`PHOGET_${browser.toUpperCase()}_TEST_PORT`, String(browserPorts[index])],
      ]),
    ),
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
  logger.log(
    `Worktree ${id}: dev http://127.0.0.1:${web} (API ${api}), test ${test}, Storybook ${storybook}; PostgreSQL ${new URL(url("postgres")).host}, databases ${names.dev}, ${names.test}`,
  );
  if (command === "run") {
    const args = commandArgs;
    if (
      (args[0] === "npm" &&
        args[1] === "run" &&
        ["check", "test", "test:e2e", "test:storybook", "gallery:errors", "db:setup:test"].includes(
          args[2],
        )) ||
      (args[0] === "npm" && args[1] === "test")
    ) {
      env.DATABASE_URL = env.PHOGET_TEST_URL;
    }
    const child = spawn(args[0], args.slice(1), { cwd: root, stdio: "inherit", env });
    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.once(signal, () => child.kill(signal));
    }
    child.once("error", (error) => {
      logger.error(error);
      process.exitCode = 1;
    });
    child.once("exit", (code, signal) => {
      process.exitCode = code ?? (signal ? 1 : 0);
    });
  }
}
