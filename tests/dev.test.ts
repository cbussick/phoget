import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { resolve } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolveConfig } from "vite";
import { chromium } from "@playwright/test";

test("Vite cache belongs to the project, not shared node_modules", async () => {
  const config = await resolveConfig({}, "serve");
  assert.equal(config.cacheDir, resolve(".cache/vite"));
});

async function reservePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  return { server, port: address.port };
}

test(
  "dev falls back from an occupied port and restricts writes to the actual origin",
  { timeout: 60_000 },
  async () => {
    const occupied = await reservePort();
    const backend = await reservePort();
    await new Promise<void>((resolve) => backend.server.close(() => resolve()));
    const cacheDir = await mkdtemp(resolve(tmpdir(), "gather-vite-test-"));
    const child = spawn(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "--env-file=.env.test",
        "scripts/dev.ts",
        "--port",
        String(occupied.port),
      ],
      {
        env: { ...process.env, PORT: String(backend.port), GATHER_VITE_CACHE_DIR: cacheDir },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (data) => {
      output += String(data);
    });
    child.stderr.on("data", (data) => {
      output += String(data);
    });
    const exited = once(child, "exit");
    try {
      let origin: string | undefined;
      const deadline = Date.now() + 40_000;
      while (Date.now() < deadline) {
        origin = output.match(/Phoget dev origin: (http:\/\/127\.0\.0\.1:\d+)/)?.[1];
        if (origin) {
          try {
            if ((await fetch(origin + "/api/health", { signal: AbortSignal.timeout(1000) })).ok)
              break;
          } catch {
            /* Wait for the API watcher to start. */
          }
        }
        assert.equal(child.exitCode, null, output);
        await delay(100);
      }
      assert(origin, output);
      assert(Number(new URL(origin).port) > occupied.port, output);
      const write = (requestOrigin: string) =>
        fetch(origin + "/api/lists", {
          method: "POST",
          headers: {
            Origin: requestOrigin,
            "Content-Type": "application/json",
            "X-Gather-Request": "1",
          },
          body: JSON.stringify({ name: "Port test" }),
          signal: AbortSignal.timeout(5000),
        });
      // An unauthenticated write reaches authentication rather than failing the origin check.
      assert.equal((await write(origin)).status, 401, output);
      assert.equal((await write(`http://127.0.0.1:${occupied.port}`)).status, 403, output);
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage();
        const user = {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Test",
          username: "test",
          role: "admin",
          mustChangePassword: false,
        };
        // Exercise Vite's actual on-demand dependency loading without modifying data.
        await page.route(origin + "/api/**", (route) => {
          const path = new URL(route.request().url()).pathname;
          const body =
            path === "/api/session"
              ? { user }
              : path === "/api/members"
                ? [user]
                : { lists: [], items: [], settings: { id: 1, householdName: "Test" } };
          return route.fulfill({ json: body });
        });
        await page.goto(origin);
        await page.getByRole("button", { name: "Neue Liste", exact: true }).click();
        await page.getByRole("button", { name: "Farbe auswählen", exact: true }).click();
        await page
          .getByRole("dialog", { name: "Eigene Farbe", exact: true })
          .getByRole("slider", { name: "Farbton", exact: true })
          .waitFor({ state: "visible", timeout: 15_000 });
      } finally {
        await browser.close();
      }
    } finally {
      child.kill("SIGTERM");
      const killTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
      await exited;
      clearTimeout(killTimer);
      occupied.server.close();
      await rm(cacheDir, { recursive: true, force: true });
    }
  },
);
