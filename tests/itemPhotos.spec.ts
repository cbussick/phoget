import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { test } from "./browserTest";
import { addItemResultSchema, listSchema, stateSchema } from "../shared/contracts";
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
    const item = addItemResultSchema.parse(
      await (
        await request.post(`/api/lists/${list.id}/items`, { data: { name: "A camera" } })
      ).json(),
    );
    await page.goto(`/lists/${list.id}`);
    await page.getByRole("button", { name: "A camera", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Foto wählen" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Fotoquelle" })).toHaveCount(0);
    const save = page.getByRole("button", { name: "Änderungen speichern" });
    const savePosition = await save.boundingBox();
    await page.getByRole("button", { name: "Foto wählen" }).click();
    const choices = page.getByRole("group", { name: "Fotoquelle" });
    await expect(choices).toBeVisible();
    expect((await save.boundingBox())?.y).toBe(savePosition?.y);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(choices).toHaveCount(0);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Foto wählen" }).click();
    await expect(choices).toBeVisible();
    await expect(page.getByText("Foto aufnehmen", { exact: true })).toBeVisible();
    await expect(page.getByText("Foto auswählen", { exact: true })).toBeVisible();
    const camera = page.locator('.item-photo-picker input[capture="environment"]');
    const gallery = page.locator(".item-photo-picker input:not([capture])");
    await expect(camera).toHaveAttribute("capture", "environment");
    await expect(camera).toHaveAttribute("accept", "image/*");
    await page.getByRole("button", { name: "Foto wählen" }).focus();
    await page.keyboard.press("Tab");
    await expect(camera).toBeFocused();
    await expect(gallery).toHaveAttribute("accept", /image\/heic/);
    await expect(gallery).not.toHaveAttribute("capture", "environment");
    const badPhoto = {
      name: "bad.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("not a real image"),
    };
    for (const input of [camera, gallery]) {
      if (input === gallery) await page.getByRole("button", { name: "Foto wählen" }).click();
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
    await page.setViewportSize({ width: 390, height: 844 });
    const trigger = page.getByRole("button", { name: "Foto wählen" });
    await trigger.click();
    await expect(choices).toBeVisible();
    const buttonBox = await trigger.boundingBox();
    const popupBox = await choices.boundingBox();
    expect(buttonBox && popupBox).toBeTruthy();
    expect(popupBox!.x).toBeGreaterThanOrEqual(0);
    expect(popupBox!.x + popupBox!.width).toBeLessThanOrEqual(390);
    expect(popupBox!.y).toBeGreaterThanOrEqual(0);
    expect(popupBox!.y + popupBox!.height).toBeLessThanOrEqual(844);
    // The popup stays attached to the button, below when there is room, above otherwise.
    expect(
      Math.min(
        Math.abs(popupBox!.y - buttonBox!.y - buttonBox!.height),
        Math.abs(popupBox!.y + popupBox!.height - buttonBox!.y),
      ),
    ).toBeLessThanOrEqual(24);
    await page.keyboard.press("Escape");
    const state = stateSchema.parse(await (await request.get("/api/state")).json());
    expect(state.items.find((entry) => entry.id === item.id)?.hasPhoto).toBe(false);
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});

test("existing photo appears above its actions only in the edit dialog", async ({
  page,
  request,
  context,
  browserName,
}) => {
  const session = await request.post("/api/session", { data: testCredentials });
  expect(session.status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (await request.post("/api/lists", { data: { name: "Photo layout" } })).json(),
  );
  try {
    const item = addItemResultSchema.parse(
      await (
        await request.post(`/api/lists/${list.id}/items`, { data: { name: "With photo" } })
      ).json(),
    );
    // Store a real WebP fixture without depending on host ImageMagick in browser tests.
    const databaseUrl = process.env[`PHOGET_${browserName.toUpperCase()}_TEST_URL`];
    if (!databaseUrl) throw new Error("Missing browser test database");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await pool.query('INSERT INTO item_photos ("itemId", data) VALUES ($1, $2)', [
        item.id,
        readFileSync("tests/fixtures/photo-synthetic.webp"),
      ]);
    } finally {
      await pool.end();
    }
    await page.goto(`/lists/${list.id}`);
    await expect(page.locator(".item-details img")).toHaveCount(0);
    await page.getByRole("button", { name: "With photo", exact: true }).click();
    const preview = page.getByRole("img", { name: "Foto zu With photo" });
    const remove = page.getByRole("button", { name: "Foto entfernen" });
    const replace = page.getByRole("button", { name: "Anderes Foto wählen" });
    await expect(preview).toBeVisible();
    await expect(remove).toBeVisible();
    await expect(replace).toBeVisible();
    const photoBox = await preview.boundingBox();
    const removeBox = await remove.boundingBox();
    const replaceBox = await replace.boundingBox();
    expect(photoBox && removeBox && replaceBox).toBeTruthy();
    expect(removeBox!.y).toBeGreaterThanOrEqual(photoBox!.y);
    expect(removeBox!.x + removeBox!.width).toBeLessThanOrEqual(photoBox!.x + photoBox!.width);
    expect(photoBox!.y + photoBox!.height).toBeLessThan(replaceBox!.y);
    await replace.click();
    const choices = page.getByRole("group", { name: "Fotoquelle" });
    await expect(choices).toBeVisible();
    await page.getByRole("heading", { name: "With photo" }).click();
    await expect(choices).toHaveCount(0);
    await remove.click();
    const confirmation = page.getByRole("group", { name: "Foto entfernen bestätigen" });
    await expect(confirmation).toBeVisible();
    await expect(preview).toBeVisible();
    await confirmation.getByRole("button", { name: "Abbrechen" }).click();
    await expect(confirmation).toHaveCount(0);
    await expect(preview).toBeVisible();
    await remove.click();
    await confirmation.getByRole("button", { name: "Foto entfernen" }).click();
    await expect(preview).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Foto wählen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Foto wählen" })).toBeFocused();
    await expect(page.getByRole("group", { name: "Fotoquelle" })).toHaveCount(0);
    await expect(page.locator(".item-details img")).toHaveCount(0);
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});
