import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { test } from "./browserTest";
import { addItemResultSchema, listSchema } from "../shared/contracts";
import { testCredentials } from "./testCredentials";

const createdListIds: string[] = [];
test.beforeEach(async ({ request, context }) => {
  const login = await request.post("/api/session", { data: testCredentials });
  expect(login.status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
});
test.afterEach(async ({ request }) => {
  for (const id of createdListIds.splice(0)) await request.delete(`/api/lists/${id}`);
});

test("status tabs support keyboard selection, empty states, live counts, and drafts", async ({
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
  const open = page.getByRole("tab", { name: /^Offen / });
  const completed = page.getByRole("tab", { name: /^Erledigt / });
  await expect(open).toHaveAttribute("aria-selected", "true");
  await expect(open).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(open).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.getByRole("heading", { name: "Hier ist noch nichts" })).toBeVisible();
  await open.focus();
  await open.press("ArrowRight");
  await expect(completed).toBeFocused();
  await expect(completed).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Noch nichts erledigt" })).toBeVisible();
  const input = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
  await input.fill("Keep my draft");
  await completed.focus();
  await completed.press("Home");
  await expect(open).toHaveAttribute("aria-selected", "true");
  await expect(input).toHaveValue("Keep my draft");
  await input.fill("Milk");
  await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await expect(open).toHaveAccessibleName("Offen 1");
  await page.getByRole("checkbox", { name: "Milk als erledigt markieren", exact: true }).click();
  await expect(open).toHaveAccessibleName("Offen 0");
  await expect(completed).toHaveAccessibleName("Erledigt 1");
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
  await expect(open).toHaveAccessibleName("Offen 1");
  await expect(completed).toHaveAccessibleName("Erledigt 0");
  await expect(completed).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Noch nichts erledigt" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.reload();
  await expect(open).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Milk", exact: true })).toBeVisible();
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
  await page.getByRole("tab", { name: "Erledigt 3", exact: true }).click();
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
  await page.getByRole("tab", { name: "Erledigt 3", exact: true }).click();
  await expect(page.locator(".item-name")).toHaveText(["Done B", "Done A", "Done C"]);
});
