import assert from "node:assert/strict";
import { deferred } from "./deferred";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";
import { chromium, firefox, webkit, expect } from "@playwright/test";

test(
  "controls discard open/highlight state across disabled and invalid transitions",
  { timeout: 120_000 },
  async (t) => {
    const cacheDir = await mkdtemp(join(tmpdir(), "phoget-control-lifecycle-"));
    const server = await createServer({
      cacheDir,
      server: { host: "127.0.0.1", port: 0, hmr: false },
      plugins: [
        {
          name: "control-lifecycle-fixture",
          configureServer(server) {
            server.middlewares.use("/control-lifecycle", (_request, response) => {
              void server
                .transformIndexHtml(
                  "/control-lifecycle",
                  '<div id="root"></div><script type="module" src="/tests/fixtures/controlLifecycle.tsx"></script>',
                )
                .then((html) => {
                  response.setHeader("Content-Type", "text/html");
                  response.end(html);
                });
            });
          },
        },
      ],
    });
    await server.listen();
    const address = server.httpServer?.address();
    assert.ok(address && typeof address !== "string");
    try {
      for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
        await t.test(name, async () => {
          const browser = await engine.launch();
          try {
            const page = await browser.newPage();
            await page.goto(`http://127.0.0.1:${address.port}/control-lifecycle`);
            const combo = page.getByRole("combobox", { name: "Item", exact: true });
            const select = page.getByRole("combobox", { name: "Role", exact: true });
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
            let releaseSave: (() => void) | undefined;
            const saveHold = new Promise<void>((resolve) => {
              releaseSave = resolve;
            });
            await page.route("**/lifecycle-save", async (route) => {
              await saveHold;
              await route.fulfill({ status: 204 });
            });
            await page.getByRole("button", { name: "A verschieben", exact: true }).focus();
            await page.keyboard.press("Space");
            await expect(page.locator(".lifecycle-rows .is-dragging")).toHaveCount(1);
            await page.keyboard.press("ArrowDown");
            await expect(page.locator('[id^="DndLiveRegion-"]')).toContainText("Über Position 2.");
            await page.keyboard.press("Space");
            const ordered = page.locator(".lifecycle-rows > li > span");
            try {
              await expect(ordered).toHaveText(["B", "A"]);
              await page.getByRole("button", { name: "Server update" }).click();
              await expect(ordered).toHaveText(["B", "A", "C"]);
            } finally {
              releaseSave?.();
            }
            await expect(ordered).toHaveText(["C", "B", "A"]);
            await page.unroute("**/lifecycle-save");
            const failedSave = deferred();
            await page.route("**/lifecycle-save", async (route) => {
              await failedSave.promise;
              await route.fulfill({ status: 500 });
            });
            await page.getByRole("button", { name: "C verschieben", exact: true }).focus();
            await page.keyboard.press("Space");
            await expect(page.locator(".lifecycle-rows .is-dragging")).toHaveCount(1);
            await page.keyboard.press("ArrowDown");
            await expect(page.locator('[id^="DndLiveRegion-"]')).toContainText("Über Position 2.");
            await page.keyboard.press("Space");
            try {
              await expect(ordered).toHaveText(["B", "C", "A"]);
            } finally {
              failedSave.release();
            }
            await expect(ordered).toHaveText(["C", "B", "A"]);
            await expect(
              page
                .getByRole("region", { name: "Benachrichtigung" })
                .filter({ hasText: "Save failed" }),
            ).toBeVisible();
          } finally {
            await browser.close();
          }
        });
      }
    } finally {
      await server.close();
      await rm(cacheDir, { recursive: true, force: true });
    }
  },
);
