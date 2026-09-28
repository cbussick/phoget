import { expect } from "@playwright/test";
import { test } from "./browserTest";
import { itemSchema, listSchema, stateSchema } from "../shared/contracts";
import { testCredentials } from "./testCredentials";

test("camera and gallery pickers share upload handling without losing the item edit", async ({
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
    await expect(page.getByText("Foto aufnehmen", { exact: true })).toBeVisible();
    await expect(page.getByText("Foto auswählen", { exact: true })).toBeVisible();
    const camera = page.locator(".item-photo-camera-picker input");
    const gallery = page.locator(".item-photo-picker:not(.item-photo-camera-picker) input");
    await expect(camera).toHaveAttribute("capture", "environment");
    await expect(camera).toHaveAttribute("accept", "image/*");
    await expect(gallery).toHaveAttribute("accept", /image\/heic/);
    await expect(gallery).not.toHaveAttribute("capture", "environment");
    const badPhoto = {
      name: "bad.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("not a real image"),
    };
    for (const input of [camera, gallery]) {
      const response = page.waitForResponse(
        (result) =>
          result.url().endsWith(`/api/items/${item.id}/photo`) &&
          result.request().method() === "PUT",
      );
      await input.setInputFiles(badPhoto);
      expect((await response).status()).toBe(415);
      await expect(
        page.getByText("Bitte wähle ein JPEG-, PNG-, WebP- oder HEIC-Foto aus.").last(),
      ).toBeVisible();
    }
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Änderungen speichern" })).toBeEnabled();
    const state = stateSchema.parse(await (await request.get("/api/state")).json());
    expect(state.items.find((entry) => entry.id === item.id)?.hasPhoto).toBe(false);
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});
