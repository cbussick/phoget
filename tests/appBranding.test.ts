import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test",
  username: "test",
  role: "admin",
  mustChangePassword: false,
};
const state = { lists: [], items: [], settings: { id: 1, householdName: "Test" } };
function deferred() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

test(
  "branding and startup loading work across browsers, motion preferences and failures",
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
            const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
            const page = await context.newPage();
            let signedIn = true;
            let sessionHold: ReturnType<typeof deferred> | undefined;
            let stateHold: ReturnType<typeof deferred> | undefined;
            let sessionFail = false;
            let stateFail = false;
            await page.route(`${origin}/api/**`, async (route) => {
              const path = new URL(route.request().url()).pathname;
              if (path === "/api/session") {
                await sessionHold?.promise;
                if (sessionFail) return route.abort("failed");
              }
              if (path === "/api/state") {
                await stateHold?.promise;
                if (stateFail) return route.fulfill({ status: 503, json: { error: "Offline" } });
              }
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
              "/branding/little-tangle/logo-wordmark.svg",
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
            const markBox = await desktop.boundingBox();
            assert.ok(markBox && markBox.height < 100 && markBox.width > 150);
            const navBox = await page.locator(".sidebar .nav-links").boundingBox();
            assert.ok(navBox);
            assert.equal(Math.round(navBox.y - markBox.y - markBox.height), 24);
            if (name === "chromium")
              await page.screenshot({ path: ".runtime/branding-review/header-desktop.png" });
            await page.setViewportSize({ width: 320, height: 844 });
            await page.reload();
            await page.getByRole("heading", { name: "Alle Listen", exact: true }).waitFor();
            assert.equal(await page.evaluate(() => window.scrollY), 0);
            assert.equal(
              await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
              true,
            );
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
              await page.locator(".login-page .brand-logo").getAttribute("src"),
              "/branding/little-tangle/logo-full.svg",
            );
            assert.equal(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              true,
            );

            signedIn = true;
            sessionHold = deferred();
            stateHold = deferred();
            await page.emulateMedia({ reducedMotion: "no-preference" });
            await page.reload();
            await page.locator(".loading-screen").waitFor();
            assert.equal(
              await page.locator(".loading-mark .brand-logo").getAttribute("src"),
              "/branding/little-tangle/logo-full.svg",
            );
            assert.equal(
              await page.locator(".loading-screen [role=status]").textContent(),
              "Wird geladen…",
            );
            assert.equal(
              await page
                .locator(".loading-mark")
                .evaluate((node) => getComputedStyle(node).animationName),
              "loading-float",
            );
            assert.equal(
              await page
                .locator(".loading-track span")
                .evaluate((node) => getComputedStyle(node).animationName),
              "loading-sweep",
            );
            assert.equal(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              true,
            );
            if (name === "chromium") {
              await page.screenshot({ path: ".runtime/branding-review/loading-mobile.png" });
              await page.setViewportSize({ width: 1280, height: 900 });
              await page.screenshot({ path: ".runtime/branding-review/loading-desktop.png" });
            }
            await page.emulateMedia({ reducedMotion: "reduce" });
            assert.equal(
              await page
                .locator(".loading-mark")
                .evaluate((node) => getComputedStyle(node).animationName),
              "none",
            );
            assert.equal(
              await page
                .locator(".loading-track span")
                .evaluate((node) => getComputedStyle(node).animationName),
              "none",
            );
            assert.deepEqual(
              (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
                .violations,
              [],
            );
            sessionHold.release();
            await page.getByText("Deine Listen werden geladen…", { exact: true }).waitFor();
            stateHold.release();
            await page
              .getByRole("heading", { name: "Alle Listen", exact: true })
              .waitFor({ timeout: 2000 });
            assert.equal(await page.locator(".loading-screen").count(), 0);
            assert.equal(
              await page
                .locator("#main-content")
                .evaluate((node) => node === document.activeElement),
              true,
            );

            // Background refresh must keep the usable screen, not replay startup motion.
            stateHold = deferred();
            const refreshed = page.waitForRequest(
              (request) => new URL(request.url()).pathname === "/api/state",
              { timeout: 5000 },
            );
            await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
            await refreshed;
            assert.equal(await page.locator(".loading-screen").count(), 0);
            assert.equal(
              await page.getByRole("heading", { name: "Alle Listen", exact: true }).isVisible(),
              true,
            );
            stateHold.release();

            // An offline-like startup failure must settle into an actionable error.
            sessionHold = undefined;
            stateHold = undefined;
            sessionFail = true;
            await page.addInitScript(() =>
              Object.defineProperty(navigator, "onLine", { get: () => false }),
            );
            await page.reload();
            await page
              .getByRole("heading", { name: "Keine Verbindung möglich", exact: true })
              .waitFor();
            assert.equal(await page.locator(".loading-screen").count(), 0);
            sessionFail = false;
            signedIn = false;
            await page.getByRole("button", { name: "Erneut versuchen", exact: true }).click();
            await page.getByRole("heading", { name: "Willkommen zu Hause", exact: true }).waitFor();

            signedIn = true;
            stateFail = true;
            await page.reload();
            await page
              .getByRole("heading", {
                name: "Deine Listen konnten nicht geladen werden",
                exact: true,
              })
              .waitFor();
            assert.equal(await page.locator(".loading-screen").count(), 0);
            stateFail = false;
            await page.getByRole("button", { name: "Erneut versuchen", exact: true }).click();
            await page.getByRole("heading", { name: "Alle Listen", exact: true }).waitFor();
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
