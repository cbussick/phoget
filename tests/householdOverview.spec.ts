import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { test } from "./browserTest";
import { testCredentials } from "./testCredentials";

test.beforeEach(async ({ request, context }) => {
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
});

for (const width of [390, 1280]) {
  test(`household overview is in settings, not the sidebar, at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/settings");
    const account = page.locator(".sidebar-user");
    await expect(account).toContainText("Test Admin");
    await expect(account).toContainText(`@${testCredentials.username}`);
    await expect(account.locator(".avatar")).toHaveCount(1);
    await expect(account).not.toContainText("Unser Haushalt");
    await page.getByRole("button", { name: "Haushalt", exact: true }).click();
    const overview = page.getByRole("region", { name: "Haushaltsübersicht" });
    await expect(overview.getByRole("heading", { name: "Unser Haushalt" })).toBeVisible();
    await expect(overview).toContainText("1 Person");
    await expect(overview.getByRole("img", { name: "Test Admin" })).toBeVisible();
    await expect(page.getByLabel("Name des Haushalts")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("household-overview.png") });
  });
}

test("household member errors can be retried without showing an incorrect count", async ({
  page,
}) => {
  let unavailable = true;
  let memberRequests = 0;
  await page.route("**/api/members", async (route) => {
    memberRequests++;
    if (unavailable) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Mitglieder sind gerade nicht verfügbar." }),
      });
    } else {
      await route.continue();
    }
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Alle Listen", exact: true })).toBeVisible();
  expect(memberRequests).toBe(0);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Haushalt", exact: true }).click();
  const overview = page.getByRole("region", { name: "Haushaltsübersicht" });
  await expect(overview.getByRole("status")).toHaveText("Mitglieder werden geladen…");
  await expect(overview.getByRole("button", { name: "Erneut versuchen" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(overview).toContainText("Mitglieder sind gerade nicht verfügbar.");
  await expect(overview).not.toContainText("0 Personen");
  await expect(page.getByRole("region", { name: "Angemeldetes Konto" })).toContainText(
    "Test Admin",
  );
  unavailable = false;
  await overview.getByRole("button", { name: "Erneut versuchen" }).click();
  await expect(overview).toContainText("1 Person");
  await expect(overview.getByRole("button", { name: "Erneut versuchen" })).toHaveCount(0);
});
