import { expect } from "@playwright/test";
import { test } from "./browserTest";
import { testCredentials } from "./testCredentials";

test("list edit dialog fits a narrow viewport with a long list name", async ({
  page,
  request,
  context,
}) => {
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
  const list = await (
    await request.post("/api/lists", {
      data: { name: "Farben f3cf8479-2a31-47c7-8ae0-169938b778e2" },
    })
  ).json();
  try {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`/lists/${list.id}`, { waitUntil: "commit" });
    await page.getByRole("button", { name: "Weitere Optionen" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await expect(page.getByRole("button", { name: "Dialog schließen" })).toBeInViewport();
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});
