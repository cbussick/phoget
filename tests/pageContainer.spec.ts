import { expect } from "@playwright/test";
import { test } from "./browserTest";
import { testCredentials } from "./testCredentials";

for (const width of [320, 390, 768, 1280]) {
  test(`settings shares the lists container and heading alignment at ${width}px`, async ({
    page,
    request,
    context,
  }, testInfo) => {
    await request.post("/api/session", { data: testCredentials });
    await context.addCookies((await request.storageState()).cookies);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Alle Listen", exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const lists = await page.locator("#main-content").boundingBox();
    const listsHeading = await page
      .getByRole("heading", { name: "Alle Listen", exact: true })
      .boundingBox();
    await page.getByRole("link", { name: "Einstellungen", exact: true }).click();
    const heading = page.getByRole("heading", { name: "Einstellungen", exact: true });
    await expect(heading).toBeVisible();
    const settings = await page.locator("#main-content").boundingBox();
    const settingsHeading = await heading.boundingBox();
    expect(settings!.x).toBe(lists!.x);
    expect(settings!.width).toBe(lists!.width);
    expect(settingsHeading!.x).toBe(listsHeading!.x);
    const wordmark = page.getByRole("img", { name: "phoget", exact: true });
    if (width < 768) {
      // The overview title is centered beside its wordmark, while settings has no wordmark.
      expect(listsHeading!.y).toBeLessThan(48);
      expect(settingsHeading!.y).toBeLessThan(48);
      await expect(wordmark).toHaveCount(0);
    } else {
      expect(settingsHeading!.y).toBe(listsHeading!.y);
      await expect(wordmark).toBeVisible();
    }
    await expect(page).toHaveTitle("Einstellungen | phoget");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.getByRole("tab", { name: "Haushalt", exact: true }).click();
    await expect(page.getByRole("table", { name: "Benutzer im Haushalt" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("settings-container.png") });
  });
}
