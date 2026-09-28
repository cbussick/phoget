import { expect } from "@playwright/test";
import { test } from "./browserTest";
import { itemSchema, listSchema, stateSchema } from "../shared/contracts";
import { testCredentials } from "./testCredentials";

test("item photo picker keeps editing available after a rejected upload", async ({
  page,
  request,
  context,
}) => {
  const session = await request.post("/api/session", { data: testCredentials });
  expect(session.status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (await request.post("/api/lists", { data: { name: "Photo picker" } })).json(),
  );
  try {
    const item = itemSchema.parse(
      await (
        await request.post(`/api/lists/${list.id}/items`, { data: { name: "A camera" } })
      ).json(),
    );
    await page.goto(`/lists/${list.id}`);
    await page.getByRole("button", { name: "A camera", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Foto hinzufügen")).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
      name: "bad.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("not a real image"),
    });
    await expect(
      page.getByText("Bitte wähle ein JPEG-, PNG-, WebP- oder HEIC-Foto aus."),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Änderungen speichern" })).toBeEnabled();
    const state = stateSchema.parse(await (await request.get("/api/state")).json());
    expect(state.items.find((entry) => entry.id === item.id)?.hasPhoto).toBe(false);
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});
