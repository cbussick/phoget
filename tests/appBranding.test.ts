import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test",
  username: "test",
  role: "admin",
  mustChangePassword: false,
};
const state = { lists: [], items: [], settings: { id: 1, householdName: "Test" } };

test(
  "selected branding renders on desktop, mobile and login in all browser engines",
  { timeout: 120_000 },
  async (t) => {
    const cacheDir = await mkdtemp(resolve(tmpdir(), "phoget-branding-vite-"));
    const server = await createServer({
      cacheDir,
      server: { host: "127.0.0.1", port: 0, hmr: false },
    });
    await server.listen();
    const address = server.httpServer!.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    await mkdir(".runtime/branding-review", { recursive: true });
    try {
      for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
        await t.test(name, async () => {
          const browser = await engine.launch();
          try {
            const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
            let signedIn = true;
            await page.route(`${origin}/api/**`, (route) => {
              const path = new URL(route.request().url()).pathname;
              return route.fulfill({
                json:
                  path === "/api/session"
                    ? { user: signedIn ? user : null }
                    : path === "/api/members"
                      ? [user]
                      : state,
              });
            });
            await page.goto(origin);
            await page.getByRole("heading", { name: "Alle Listen", exact: true }).waitFor();
            const desktop = page.locator(".sidebar .brand-logo");
            assert.equal(await desktop.isVisible(), true);
            assert.equal(
              await desktop.getAttribute("src"),
              "/branding/little-tangle/logo-full.svg",
            );
            await page.waitForFunction(() =>
              Array.from(document.images)
                .filter((image) => image.classList.contains("brand-logo"))
                .every((image) => image.complete && image.naturalWidth > 0),
            );
            assert.equal(
              await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute("href"),
              "/branding/little-tangle/favicon.svg",
            );
            if (name === "chromium")
              await page.screenshot({ path: ".runtime/branding-review/header-desktop.png" });
            await page.setViewportSize({ width: 320, height: 844 });
            assert.equal(await page.locator(".mobile-brand-header .brand-logo").isVisible(), true);
            assert.equal(await desktop.isVisible(), false);
            assert.equal(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              true,
            );
            if (name === "chromium")
              await page.screenshot({ path: ".runtime/branding-review/header-mobile.png" });
            signedIn = false;
            await page.reload();
            await page.getByRole("heading", { name: "Willkommen zu Hause", exact: true }).waitFor();
            assert.equal(await page.locator(".login-page .brand-logo").isVisible(), true);
            assert.equal(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              true,
            );
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
