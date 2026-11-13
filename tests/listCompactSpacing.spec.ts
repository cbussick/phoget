import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { test } from "./browserTest";
import { listSchema } from "../shared/contracts";
import { testCredentials } from "./testCredentials";

test("compact composer keeps its accessible label and reduces the bottom navigation gap", async ({
  page,
  request,
  context,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 680 });
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
  const response = await request.post("/api/lists", {
    data: { name: "Supermarkt", icon: "shop", color: "#93c9a4" },
  });
  expect(response.status()).toBe(201);
  const list = listSchema.parse(await response.json());
  try {
    for (const name of [
      "Blueberry Sirup (Fabbri)",
      "Buttermilch Dessert (Birne Vanille)",
      "Tempoboxen",
      "Milch",
      "Eier",
      "Äpfel",
    ]) {
      expect((await request.post(`/api/lists/${list.id}/items`, { data: { name } })).status()).toBe(
        201,
      );
    }
    for (const name of ["Brot", "Ingwer", "Lauchzwiebel"]) {
      const item = await (
        await request.post(`/api/lists/${list.id}/items`, { data: { name } })
      ).json();
      expect(
        (await request.patch(`/api/items/${item.id}`, { data: { completed: true } })).status(),
      ).toBe(200);
    }
    await page.goto(`/lists/${list.id}`);
    const input = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
    await expect(input).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Lauchzwiebel", exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await testInfo.attach("short-screen-layout", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    if (process.env.PHOGET_LAYOUT_SCREENSHOT) {
      await page.screenshot({ path: process.env.PHOGET_LAYOUT_SCREENSHOT });
    }
    await expect(page.locator(".list-controls .page-header")).toHaveCSS("row-gap", "4px");
    await expect(page.locator(".add-item-form .form-field")).toHaveCSS("row-gap", "0px");
    await expect(page.locator(".quick-add")).toHaveCSS("padding-bottom", "12px");
    const icon = await page.locator(".page-header > .list-icon").boundingBox();
    for (const selector of [".title-row > div", ".title-row > button"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box!.y + box!.height / 2).toBeCloseTo(icon!.y + icon!.height / 2, 1);
    }
    const label = page.locator(".add-item-form label");
    await expect(label).toHaveClass("visually-hidden");
    const inputBox = await page.locator(".add-item-form .field-control").boundingBox();
    const addBox = await page
      .getByRole("button", { name: "Hinzufügen", exact: true })
      .boundingBox();
    expect(inputBox!.y).toBeCloseTo(addBox!.y, 1);
    const pane = await page.locator(".list-items-card").boundingBox();
    const nav = await page.getByRole("navigation", { name: "Mobile Navigation" }).boundingBox();
    expect(nav!.y - pane!.y - pane!.height).toBeCloseTo(16, 1);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});
