import { expect } from "@playwright/test";
import { test } from "./browserTest";
import AxeBuilder from "@axe-core/playwright";
import { listSchema } from "../shared/contracts";
import { testCredentials } from "./testCredentials";

test("item press feedback, symbol sizing, deletion section and back navigation", async ({
  page,
  request,
  context,
  browserName,
}) => {
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (
      await request.post("/api/lists", { data: { name: "Bedienung " + crypto.randomUUID() } })
    ).json(),
  );
  try {
    expect(
      (await request.post(`/api/lists/${list.id}/items`, { data: { name: "Milch" } })).status(),
    ).toBe(201);
    await page.goto(`/lists/${list.id}`);
    const row = page.locator(".item-row").filter({ hasText: "Milch" });
    const checkbox = row.getByRole("checkbox");
    await checkbox.hover();
    await expect(row).toHaveCSS("background-color", "rgb(242, 245, 243)");
    // This environment's headless Firefox does not retain any :active elements
    // during mouse.down; verify held-pointer feedback in Chromium and WebKit.
    if (browserName !== "firefox") {
      const pressed = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.backgroundColor = "var(--color-fill-pressed)";
        document.body.append(probe);
        const color = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return color;
      });
      await page.mouse.down();
      await expect(row).toHaveCSS("background-color", "rgb(242, 245, 243)");
      await expect(checkbox).toHaveCSS("background-color", pressed);
      // Release outside the control, without toggling completion.
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await row.locator(".item-details").hover();
      await page.mouse.down();
      await expect(row).toHaveCSS("background-color", pressed);
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }
    await page.getByRole("button", { name: "Weitere Optionen" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("group", { name: "Symbol", exact: true }).locator("svg").first(),
    ).toHaveCSS("width", "32px");
    const deletion = dialog.getByRole("region", { name: "Liste löschen" });
    await expect(deletion.getByRole("heading")).toHaveText("Liste löschen");
    await expect(deletion).toHaveCSS("border-bottom-width", "1px");
    expect(
      await deletion.evaluate((element) =>
        Boolean(
          element.compareDocumentPosition(
            element.parentElement!.querySelector(".dialog-actions")!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
    ).toBe(true);
    await expect(
      deletion.getByRole("button", { name: "Liste löschen" }).locator("svg"),
    ).toBeVisible();
    await expect(
      dialog.locator(".dialog-actions").getByRole("button", { name: "Abbrechen" }),
    ).toBeVisible();
    await deletion.getByRole("button").click();
    await expect(dialog.getByRole("heading", { name: "Diese Liste löschen?" })).toBeVisible();
    await dialog.getByRole("button", { name: "Abbrechen" }).click();
    await expect(dialog.getByLabel("Listenname")).toHaveValue(list.name);
    await page.setViewportSize({ width: 320, height: 900 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await dialog.getByRole("button", { name: "Abbrechen" }).click();
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const back = page.locator(".page-header").getByRole("link", { name: "Alle Listen" });
      await expect(back).toBeVisible();
      await back.click();
      await expect(page).toHaveURL(/\/$/);
      await page.goto(`/lists/${list.id}`);
    }
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});
