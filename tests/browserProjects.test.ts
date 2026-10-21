import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

async function runner(
  context: TestContext,
  options: { failingBrowser?: string; holdBrowser?: string } = {},
) {
  const directory = await mkdtemp(join(tmpdir(), "phoget-browser-runner-"));
  const executable = join(directory, "node_modules/.bin/playwright");
  const eventLog = join(directory, "events.log");
  await mkdir(join(directory, "node_modules/.bin"), { recursive: true });
  await writeFile(
    executable,
    `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const browser = process.argv.at(-1);
const record = (event) => appendFileSync(process.env.TEST_BROWSER_LOG, browser + ":" + event + "\\n");
record("start");
setTimeout(() => {
  record("end");
  process.exit(browser === process.env.TEST_FAILING_BROWSER ? 1 : 0);
}, browser === process.env.TEST_HOLD_BROWSER ? 60_000 : 200);
`,
    { mode: 0o755 },
  );
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL("../scripts/runBrowserProjects.mjs", import.meta.url))],
    {
      cwd: directory,
      env: {
        ...process.env,
        TEST_BROWSER_LOG: eventLog,
        TEST_FAILING_BROWSER: options.failingBrowser ?? "",
        TEST_HOLD_BROWSER: options.holdBrowser ?? "",
      },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const finished = new Promise<{ code: number | null; stderr: string }>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stderr }));
  });
  context.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    await finished.catch(() => {});
    await rm(directory, { recursive: true, force: true });
  });
  const events = async () => {
    const contents = await readFile(eventLog, "utf8").catch((error) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    return contents.trim() ? contents.trim().split("\n") : [];
  };
  return { child, finished, events };
}

test("browser projects run sequentially without overlapping browser processes", async (context) => {
  const { finished, events } = await runner(context);
  const result = await finished;
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(
    await events(),
    ["chromium", "firefox", "webkit"].flatMap((browser) => [browser + ":start", browser + ":end"]),
  );
});

test("a failed browser fails the command without skipping later browsers", async (context) => {
  const { finished, events } = await runner(context, { failingBrowser: "firefox" });
  const result = await finished;
  assert.equal(result.code, 1, result.stderr);
  assert.deepEqual(
    await events(),
    ["chromium", "firefox", "webkit"].flatMap((browser) => [browser + ":start", browser + ":end"]),
  );
});

test("interrupting the runner stops its child and does not start queued browsers", async (context) => {
  const { child, finished, events } = await runner(context, { holdBrowser: "chromium" });
  const deadline = Date.now() + 5000;
  while (!(await events()).length && Date.now() < deadline) await delay(10);
  assert.ok((await events()).length, "The first browser did not start");
  assert.ok(child.kill("SIGTERM"));
  const result = await finished;
  assert.equal(result.code, 1, result.stderr);
  assert.deepEqual(await events(), ["chromium:start"]);
});
