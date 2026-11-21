import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { test } from "./browserTest";
import { addItemResultSchema, listSchema } from "../shared/contracts";
import { testCredentials } from "./testCredentials";

const createdListIds: Array<string> = [];
test.beforeEach(async ({ request, context }) => {
  const login = await request.post("/api/session", { data: testCredentials });
  expect(login.status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
});
test.afterEach(async ({ request }) => {
  for (const id of createdListIds.splice(0)) {
    await request.delete(`/api/lists/${id}`);
  }
});

test("status tabs support keyboard selection, empty states, count-free labels, and drafts", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await request.post("/api/lists", {
    data: { name: "Tab workflow", color: "#000000" },
  });
  expect(response.status()).toBe(201);
  const list = listSchema.parse(await response.json());
  createdListIds.push(list.id);
  await page.goto(`/lists/${list.id}`);
  const open = page.getByRole("tab", { name: "Offen", exact: true });
  const completed = page.getByRole("tab", { name: "Erledigt", exact: true });
  await expect(open).toHaveAttribute("aria-selected", "true");
  await expect(open).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(open).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.getByRole("heading", { name: "Hier ist noch nichts" })).toBeVisible();
  await open.focus();
  await open.press("ArrowRight");
  await expect(completed).toBeFocused();
  await expect(completed).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Noch nichts erledigt" })).toBeVisible();
  const input = page.getByRole("textbox", { name: "Eintrag hinzufügen", exact: true });
  await input.fill("Keep my draft");
  await completed.focus();
  await completed.press("Home");
  await expect(open).toHaveAttribute("aria-selected", "true");
  await expect(input).toHaveValue("Keep my draft");
  await input.fill("Milk");
  await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await expect(open).toHaveAccessibleName("Offen");
  await page.getByRole("checkbox", { name: "Milk als erledigt markieren", exact: true }).click();
  await expect(open).toHaveAccessibleName("Offen");
  await expect(completed).toHaveAccessibleName("Erledigt");
  await expect(open).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Alles erledigt!" })).toBeVisible();
  await open.focus();
  await open.press("End");
  await expect(completed).toHaveAttribute("aria-selected", "true");
  const item = page.getByRole("button", { name: "Milk", exact: true });
  await item.click();
  await page.keyboard.press("Escape");
  await expect(item).toBeFocused();
  await page.getByRole("checkbox", { name: "Milk als offen markieren", exact: true }).click();
  await expect(open).toHaveAccessibleName("Offen");
  await expect(completed).toHaveAccessibleName("Erledigt");
  await expect(completed).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Noch nichts erledigt" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.reload();
  await expect(open).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Milk", exact: true })).toBeVisible();
});

test("desktop list pane fits short content and scrolls long content below the controls", async ({
  page,
  request,
}) => {
  const height = 700;
  await page.setViewportSize({ width: 1280, height });
  const response = await request.post("/api/lists", { data: { name: "Desktop pane" } });
  expect(response.status()).toBe(201);
  const list = listSchema.parse(await response.json());
  createdListIds.push(list.id);

  for (let index = 1; index <= 16; index++) {
    const response = await request.post(`/api/lists/${list.id}/items`, {
      data: { name: `Item ${index}` },
    });
    expect(response.status()).toBe(201);
    if (index === 1) {
      const item = addItemResultSchema.parse(await response.json());
      expect(
        (await request.patch(`/api/items/${item.id}`, { data: { completed: true } })).status(),
      ).toBe(200);
    }
  }

  await page.goto(`/lists/${list.id}`);
  const open = page.getByRole("tab", { name: "Offen", exact: true });
  const completed = page.getByRole("tab", { name: "Erledigt", exact: true });
  const pane = page.getByRole("tabpanel");
  await completed.click();
  const onlyRow = page.getByRole("button", { name: "Item 1", exact: true });
  await expect(onlyRow).toBeInViewport();
  const shortPane = (await pane.boundingBox())!;
  const row = (await onlyRow.boundingBox())!;
  expect(shortPane.y + shortPane.height - (row.y + row.height)).toBeLessThan(64);

  await open.click();
  const longPane = (await pane.boundingBox())!;
  expect(longPane.y + longPane.height).toBeLessThanOrEqual(height);
  const availableBottom = await page.locator("#main-content").evaluate((element) => {
    const style = getComputedStyle(element);
    return element.getBoundingClientRect().bottom - Number.parseFloat(style.paddingBottom);
  });
  expect(longPane.y + longPane.height).toBeCloseTo(availableBottom, 0);
  const lastRow = page.getByRole("button", { name: "Item 16", exact: true });
  await expect(lastRow).not.toBeInViewport();
  const tabsBeforeScroll = await open.boundingBox();
  await lastRow.scrollIntoViewIfNeeded();
  await expect(lastRow).toBeInViewport();
  expect(await pane.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await open.boundingBox()).toEqual(tabsBeforeScroll);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("reordering completed entries persists without changing the open section", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/lists", { data: { name: "Tab reorder" } });
  expect(response.status()).toBe(201);
  const list = listSchema.parse(await response.json());
  createdListIds.push(list.id);
  for (const name of ["Open A", "Open B", "Done A", "Done B", "Done C"]) {
    const response = await request.post(`/api/lists/${list.id}/items`, { data: { name } });
    expect(response.status()).toBe(201);
    const item = addItemResultSchema.parse(await response.json());
    if (name.startsWith("Done")) {
      const completed = await request.patch(`/api/items/${item.id}`, { data: { completed: true } });
      expect(completed.status()).toBe(200);
    }
  }
  await page.goto(`/lists/${list.id}`);
  await expect(page.locator(".item-name")).toHaveText(["Open A", "Open B"]);
  await page.getByRole("tab", { name: "Erledigt", exact: true }).click();
  await expect(page.locator(".item-name")).toHaveText(["Done A", "Done B", "Done C"]);
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/lists/${list.id}/items/order/completed`) && response.ok(),
  );
  const handle = page.getByRole("button", { name: "Done A verschieben", exact: true });
  await handle.focus();
  await handle.press("Space");
  await handle.press("ArrowDown");
  await handle.press("Space");
  await saved;
  await expect(page.locator(".item-name")).toHaveText(["Done B", "Done A", "Done C"]);
  await page.reload();
  await expect(page.locator(".item-name")).toHaveText(["Open A", "Open B"]);
  await page.getByRole("tab", { name: "Erledigt", exact: true }).click();
  await expect(page.locator(".item-name")).toHaveText(["Done B", "Done A", "Done C"]);
});
