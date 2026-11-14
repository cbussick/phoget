import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { test } from "./browserTest";
import { testCredentials } from "./testCredentials";

test.beforeEach(async ({ request, context }) => {
  const login = await request.post("/api/session", { data: testCredentials });
  expect(login.status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
});

for (const width of [320, 390, 1280]) {
  test(`settings tabs support keyboard navigation at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/settings");
    const tabs = page.getByRole("tablist", { name: "Einstellungsbereiche" });
    const account = tabs.getByRole("tab", { name: "Mein Konto", exact: true });
    const household = tabs.getByRole("tab", { name: "Haushalt", exact: true });
    const users = tabs.getByRole("tab", { name: "Benutzer", exact: true });
    await expect(account).toHaveAttribute("aria-selected", "true");
    await expect(account).toHaveCSS("background-color", "rgb(139, 205, 241)");
    for (const tab of [account, household, users]) await expect(tab).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await account.focus();
    await account.press("ArrowRight");
    await expect(household).toBeFocused();
    await expect(household).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Haushalt", exact: true })).toBeVisible();
    await household.press("End");
    await expect(users).toBeFocused();
    await expect(page.getByRole("heading", { name: "Benutzer im Haushalt" })).toBeVisible();
    await users.press("Home");
    await expect(account).toBeFocused();
    await expect(page.getByRole("heading", { name: "Mein Profil" })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("settings-tabs.png") });
  });
}

for (const width of [390, 1280]) {
  test(`overview fits its content then scrolls within the viewport at ${width}px`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const pane = page.getByRole("region", { name: "Eure Listen", exact: true });
    await expect(page.getByRole("heading", { name: "Noch keine Listen" })).toBeVisible();
    const emptyBounds = await pane.boundingBox();
    expect(emptyBounds!.height).toBeLessThan(450);
    for (let index = 0; index < 2; index++) {
      const response = await request.post("/api/lists", { data: { name: `Liste ${index}` } });
      expect(response.status()).toBe(201);
    }
    await page.reload();
    await expect(pane.locator("li")).toHaveCount(2);
    const compact = await pane.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      rowsHeight: element.querySelector("ul")!.getBoundingClientRect().height,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(compact.height - compact.rowsHeight).toBeLessThanOrEqual(3);
    expect(compact.scrollHeight).toBe(compact.clientHeight);
    await expect(pane.locator("li").nth(1)).toHaveCSS("border-top-left-radius", "0px");
    await expect(pane.locator("li").nth(1)).toHaveCSS("border-top-right-radius", "0px");
    await page.screenshot({ path: testInfo.outputPath("compact-overview.png") });
    for (let index = 2; index < 20; index++) {
      const response = await request.post("/api/lists", { data: { name: `Liste ${index}` } });
      expect(response.status()).toBe(201);
    }
    await page.reload();
    await expect(pane.locator("li")).toHaveCount(20);
    const fullBounds = await pane.boundingBox();
    expect(fullBounds!.height).toBeGreaterThan(compact.height);
    await expect(pane).toBeInViewport({ ratio: 1 });
    if (width < 768) {
      const nav = await page.locator(".mobile-nav").boundingBox();
      expect(fullBounds!.y + fullBounds!.height).toBeLessThanOrEqual(nav!.y);
    }
    const headerBounds = await page.locator(".lists-header").boundingBox();
    await pane.evaluate((element) => element.scrollTo(0, 500));
    await expect.poll(() => pane.evaluate((element) => element.scrollTop)).toBe(500);
    expect(await page.locator(".lists-header").boundingBox()).toEqual(headerBounds);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("scrolling-overview.png") });
  });
}
