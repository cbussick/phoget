import { expect, type Route } from "@playwright/test";
import { test } from "./browserTest";

test("offers a manual refresh for a new build and remembers dismissal", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const currentVersion = await page.locator('meta[name="phoget-build-id"]').getAttribute("content");
  expect(currentVersion).toBeTruthy();
  let nextVersion = "new-build-1";
  const serveNewBuild = async (route: Route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(currentVersion!, nextVersion);
    await route.fulfill({ response, body: html });
  };
  await page.route("**/index.html", serveNewBuild);
  await page.route("**/", serveNewBuild);
  const check = () => page.evaluate(() => dispatchEvent(new Event("online")));
  await check();
  const notice = page.getByRole("status").filter({ hasText: "Eine neue Version ist verfügbar" });
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: "Später" }).click();
  await check();
  await expect(notice).toHaveCount(0);
  nextVersion = "new-build-2";
  await check();
  await expect(notice).toBeVisible();
  await context.setOffline(true);
  await expect(notice.getByRole("button", { name: "App aktualisieren" })).toBeDisabled();
  await context.setOffline(false);
  await expect(notice.getByRole("button", { name: "App aktualisieren" })).toBeEnabled();
  await Promise.all([
    page.waitForNavigation(),
    notice.getByRole("button", { name: "App aktualisieren" }).click(),
  ]);
  await expect(page.locator('meta[name="phoget-build-id"]')).toHaveAttribute(
    "content",
    nextVersion,
  );
});

test("ignores a response without the app build marker", async ({ page }) => {
  await page.goto("/");
  await page.route("**/index.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<html><title>Cloudflare Access</title></html>",
    }),
  );
  await page.evaluate(() => dispatchEvent(new Event("online")));
  await expect(page.getByText("Eine neue Version ist verfügbar")).toHaveCount(0);
});
