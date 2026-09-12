import { expect } from "@playwright/test";
import { test } from "./browserTest";
import AxeBuilder from "@axe-core/playwright";
import { listSchema } from "../shared/contracts";
import { testCredentials } from "./testCredentials";

test("list presets and custom colors stay in sync across icons, buttons, reloads and browsers", async ({
  page,
  request,
  context,
}, testInfo) => {
  // Full persistence/sync workflow plus three viewport accessibility audits.
  test.slow();
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
  const name = "Farben " + crypto.randomUUID();
  const ids: string[] = [];
  const other = await context.newPage();
  try {
    const untouched = listSchema.parse(
      await (await request.post("/api/lists", { data: { name: "Unverändert " + name } })).json(),
    );
    ids.push(untouched.id);
    await page.goto("/");
    await page.getByRole("button", { name: "Neue Liste", exact: true }).click();
    await page.getByLabel("Listenname", { exact: true }).fill(name);
    const presets = page.getByRole("group", { name: "Grundfarben", exact: true });
    const blue = presets.getByRole("button", { name: "Blau", exact: true });
    await expect(blue).toHaveAttribute("aria-pressed", "true");
    await blue.focus();
    await blue.press("ArrowRight");
    await expect(presets.getByRole("button", { name: "Grün", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Eigene Farbe (Hex)")).toHaveValue("#93c9a4");
    const green = presets.getByRole("button", { name: "Grün", exact: true });
    await expect(green).toHaveCSS("background-color", "rgb(255, 254, 250)");
    await expect(green).toHaveCSS("border-color", "rgb(24, 48, 43)");
    await green.hover();
    await expect(green).toHaveCSS("background-color", "rgb(242, 245, 243)");
    await page.mouse.move(0, 0);
    const createButton = page.getByRole("button", { name: "Liste erstellen", exact: true });
    await expect(createButton).toHaveCSS("background-color", "rgb(139, 205, 241)");
    await createButton.click();
    await expect(page.getByRole("dialog")).toBeHidden();
    const overview = page.getByRole("link", { name, exact: true });
    const href = await overview.getAttribute("href");
    ids.push(href!.split("/").pop()!);
    await expect(overview.locator(".list-icon")).toHaveCSS(
      "background-color",
      "rgb(147, 201, 164)",
    );
    await expect(page.locator(`a[href="/lists/${untouched.id}"] .list-icon`)).toHaveCSS(
      "background-color",
      "rgb(139, 205, 241)",
    );
    await overview.click();
    await other.goto(href!);
    const icon = page.locator(".page-header > .list-icon");
    const add = page.getByRole("button", { name: "Hinzufügen", exact: true });
    await expect(icon).toHaveCSS("background-color", "rgb(147, 201, 164)");
    await expect(add).toHaveCSS("background-color", "rgb(147, 201, 164)");
    await page.getByRole("button", { name: "Weitere Optionen" }).click();
    const hex = page.getByLabel("Eigene Farbe (Hex)");
    await hex.fill("#xyz");
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(hex).toHaveAttribute("aria-invalid", "true");
    await expect(hex).toHaveValue("#xyz");
    await expect(page.locator(".field-error")).toContainText("Hex-Farbcode");
    const picker = page.getByRole("button", { name: "Farbe auswählen", exact: true });
    await picker.click();
    const popup = page.getByRole("dialog", { name: "Eigene Farbe", exact: true });
    await expect(popup).toBeVisible();
    await expect(popup).toHaveCSS("font-family", /Nunito Variable/);
    const hue = popup.getByRole("slider", { name: "Farbton", exact: true });
    await hue.focus();
    await hue.press("Home");
    await expect(hex).not.toHaveValue("#xyz");
    await hue.press("Escape");
    await expect(popup).toBeHidden();
    await expect(picker).toBeFocused();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.locator(".color-picker > legend").evaluate((element) => {
        const label = element.parentElement!.querySelector("label")!;
        return (
          parseFloat(getComputedStyle(element).fontSize) >
          parseFloat(getComputedStyle(label).fontSize)
        );
      }),
    ).toBe(true);
    await hex.fill("#243566");
    await expect(hex).toHaveValue("#243566");
    await expect(presets.locator('[aria-pressed="true"]')).toHaveCount(0);
    await page.mouse.move(0, 0);
    await expect(page.getByRole("button", { name: "Änderungen speichern", exact: true })).toHaveCSS(
      "background-color",
      "rgb(139, 205, 241)",
    );
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(icon).toHaveCSS("background-color", "rgb(36, 53, 102)");
    await expect(add).toHaveCSS("background-color", "rgb(36, 53, 102)");
    await expect(add).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(other.locator(".page-header > .list-icon")).toHaveCSS(
      "background-color",
      "rgb(36, 53, 102)",
    );
    await page.reload();
    await expect(icon).toHaveCSS("background-color", "rgb(36, 53, 102)");

    await page.getByRole("button", { name: "Weitere Optionen" }).click();
    await expect(hex).toHaveValue("#243566");
    await hex.fill("#ABCDEF");
    await page.route("**/api/lists/*", (route) =>
      route.request().method() === "PUT"
        ? route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Speichern fehlgeschlagen." }),
          })
        : route.continue(),
    );
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.getByRole("region", { name: "Benachrichtigung" })).toContainText(
      "Speichern fehlgeschlagen.",
    );
    await expect(hex).toHaveValue("#ABCDEF");
    await expect(icon).toHaveCSS("background-color", "rgb(36, 53, 102)");
    await page.unroute("**/api/lists/*");
    await page.getByRole("button", { name: "Dialog schließen" }).click();
    await page.getByRole("button", { name: "Weitere Optionen" }).click();
    await expect(hex).toHaveValue("#243566");
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() =>
          page
            .getByRole("dialog")
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
        )
        .toBe(true);
      await picker.click();
      await expect(popup).toBeVisible();
      await expect(popup.getByRole("slider", { name: "Farbton", exact: true })).toBeVisible();
      await expect
        .poll(() =>
          popup.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return (
              rect.left >= 0 &&
              rect.right <= innerWidth &&
              rect.top >= 0 &&
              rect.bottom <= innerHeight
            );
          }),
        )
        .toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`color-dialog-${width}.png`) });
      await popup.getByRole("button", { name: "Fertig" }).click();
    }
    await hex.fill("#ABCDEF");
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(icon).toHaveCSS("background-color", "rgb(171, 205, 239)");
    await page.goto("/");
    await expect(overview.locator(".list-icon")).toHaveCSS(
      "background-color",
      "rgb(171, 205, 239)",
    );
    await overview.click();
    await page.getByRole("button", { name: "Weitere Optionen" }).click();
    await expect(hex).toHaveValue("#abcdef");
    await presets.getByRole("button", { name: "Blau", exact: true }).click();
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(icon).toHaveCSS("background-color", "rgb(139, 205, 241)");
    await expect(add).toHaveCSS("background-color", "rgb(139, 205, 241)");
  } finally {
    await other.close();
    for (const id of ids) await request.delete("/api/lists/" + id);
  }
});
