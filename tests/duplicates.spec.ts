import { expect } from "@playwright/test";
import { test } from "./browserTest";
import { listSchema, addItemResultSchema, stateSchema } from "../shared/contracts";
import { testCredentials } from "./testCredentials";

test("duplicate toast does not shift layout or focus; completed items restore silently", async ({
  page,
  request,
  context,
}) => {
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (
      await request.post("/api/lists", {
        data: { name: "Duplicates " + crypto.randomUUID() },
      })
    ).json(),
  );
  const item = addItemResultSchema.parse(
    await (
      await request.post(`/api/lists/${list.id}/items`, {
        data: { name: "Milk", note: "Keep this note" },
      })
    ).json(),
  );
  try {
    await page.goto(`/lists/${list.id}`);
    const input = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
    await input.fill("MILK");
    const before = await page.locator(".add-item-form").boundingBox();
    await input.press("Enter");
    const toast = page.getByRole("region", { name: "Benachrichtigung" });
    await expect(toast).toContainText("Dieser Eintrag steht bereits auf der Liste.");
    await expect(toast).toHaveAttribute("data-variant", "info");
    await expect(input).toBeFocused();
    expect(await page.locator(".add-item-form").boundingBox()).toEqual(before);
    await expect(page.locator(".item-name")).toHaveCount(1);
    await page.mouse.move(0, 0);
    await expect(toast).toBeHidden({ timeout: 10000 });

    await request.patch(`/api/items/${item.id}`, { data: { completed: true } });
    await page.reload();
    await input.fill("milk");
    await input.press("Enter");
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    await expect(page.locator(".item-name")).toHaveCount(1);
    await expect(toast).toBeHidden();
    const state = stateSchema.parse(await (await request.get("/api/state")).json());
    expect(state.items.find((row) => row.id === item.id)).toMatchObject({
      completed: false,
      name: "Milk",
      note: "Keep this note",
    });
    await page.reload();
    await expect(page.locator(".item-name")).toHaveCount(1);
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});
