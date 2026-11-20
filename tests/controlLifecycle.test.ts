import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import { expect } from "@playwright/test";

test("controls discard open/highlight state across disabled and invalid transitions", { timeout: 120_000 }, async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), "phoget-control-lifecycle-"));
  const server = await createServer({ cacheDir, server: {host: "127.0.0.1", port: 0, hmr: false}, plugins: [{ name: "control-lifecycle-fixture", configureServer(server) {
  server.middlewares.use("/control-lifecycle", (_request, response) => {
    void server.transformIndexHtml("/control-lifecycle", '<div id="root"></div><script type="module" src="/tests/fixtures/controlLifecycle.tsx"></script>').then((html) => {
      response.setHeader("Content-Type", "text/html");
      response.end(html);
    });
  });
  } }] });
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address !== "string");
  try {
    for (const [name, engine] of Object.entries({chromium, firefox, webkit})) {
      await t.test(name, async () => {
        const browser = await engine.launch();
        try {
          const page = await browser.newPage();
          await page.goto(`http://127.0.0.1:${address.port}/control-lifecycle`);
          const combo = page.getByRole("combobox", {name: "Item", exact: true});
          const select = page.getByRole("combobox", {name: "Role", exact: true});
          await combo.focus();
          await combo.press("ArrowDown");
          await expect(combo).toHaveAttribute("aria-expanded", "true");
          await expect(combo).toHaveAttribute("aria-activedescendant", /.+/);
          // Programmatic prop transitions must not rely on blur to reset state.
          await page.locator("#error").evaluate((button: HTMLButtonElement) => button.click());
          await expect(combo).toHaveAttribute("aria-expanded", "false");
          await page.locator("#error").evaluate((button: HTMLButtonElement) => button.click());
          await expect(combo).toHaveAttribute("aria-expanded", "false");
          await expect(combo).not.toHaveAttribute("aria-activedescendant");
          await combo.press("ArrowDown");
          await page.locator("#disabled").evaluate((button: HTMLButtonElement) => button.click());
          await expect(combo).toBeDisabled();
          await expect(combo).toHaveAttribute("aria-expanded", "false");
          await page.locator("#disabled").evaluate((button: HTMLButtonElement) => button.click());
          await expect(combo).toHaveAttribute("aria-expanded", "false");
          await select.click();
          await expect(select).toHaveAttribute("aria-expanded", "true");
          await page.locator("#disabled").evaluate((button: HTMLButtonElement) => button.click());
          await expect(select).toHaveAttribute("aria-expanded", "false");
          await page.locator("#disabled").evaluate((button: HTMLButtonElement) => button.click());
          await expect(select).toHaveAttribute("aria-expanded", "false");
          await select.press("End");
          await select.press("Enter");
          await expect(select).toHaveText("Admin");
        } finally { await browser.close(); }
      });
    }
  } finally {
    await server.close();
    await rm(cacheDir, {recursive: true, force: true});
  }
});
