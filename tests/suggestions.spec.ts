import { expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import AxeBuilder from "@axe-core/playwright";
import { test } from "./browserTest";
import {
  listSchema,
  addItemResultSchema,
  itemHistorySchema,
  stateSchema,
} from "../shared/contracts";
import { testCredentials } from "./testCredentials";

test("completed suggestions can be forgotten and fully restored with Undo", async ({
  page,
  request,
  context,
  browserName,
}) => {
  await request.post("/api/session", { data: testCredentials });
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (
      await request.post("/api/lists", { data: { name: "Suggestions " + crypto.randomUUID() } })
    ).json(),
  );
  const add = async (name: string, note = "") =>
    addItemResultSchema.parse(
      await (await request.post(`/api/lists/${list.id}/items`, { data: { name, note } })).json(),
    );
  const milk = await add("MILK", "Organic");
  await add("Mint");
  await request.patch(`/api/items/${milk.id}`, { data: { completed: true, name: "Milk" } });
  try {
    const databaseUrl = process.env[`PHOGET_${browserName.toUpperCase()}_TEST_URL`];
    if (!databaseUrl) throw new Error("Missing browser test database");
    const pool = new Pool({ connectionString: databaseUrl });
    const photo = readFileSync("tests/fixtures/photo-synthetic.webp");
    try {
      await pool.query('INSERT INTO item_photos ("itemId", data) VALUES ($1, $2)', [
        milk.id,
        photo,
      ]);
    } finally {
      await pool.end();
    }
    await page.goto(`/lists/${list.id}`);
    const input = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
    await expect(page.getByRole("button", { name: "+ MILK", exact: true })).toBeVisible();
    await input.fill("mi");
    const grid = page.getByRole("grid");
    await expect(grid).toContainText("Milk");
    await expect(grid).not.toContainText("Mint");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath("suggestions.png") });
    await grid.getByRole("button", { name: "Vorschlag vergessen: Milk", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: "Eintrag vergessen?" });
    await expect(confirm).toContainText("aus „Erledigt“ entfernt");
    await expect(confirm).toContainText("Notizen und Fotos");
    await page.screenshot({ path: test.info().outputPath("forget-confirmation.png") });
    await confirm.getByRole("button", { name: "Abbrechen", exact: true }).click();
    await expect(input).toBeFocused();
    await expect(page.locator(".completed-count")).toHaveText("1 Eintrag");
    await input.fill("Milk");
    await grid.getByRole("button", { name: "Vorschlag vergessen: Milk", exact: true }).click();
    await confirm.getByRole("button", { name: "Eintrag vergessen", exact: true }).click();
    await expect(confirm).toBeHidden();
    await expect(page.locator(".completed-items")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Benachrichtigung" })).toContainText(
      "Eintrag und Vorschlag entfernt.",
    );
    expect(
      itemHistorySchema.parse(await (await request.get(`/api/lists/${list.id}/history`)).json())
        .names,
    ).toEqual([]);
    expect(
      stateSchema
        .parse(await (await request.get("/api/state")).json())
        .items.some((row) => row.id === milk.id),
    ).toBe(false);
    await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
    await expect(page.locator(".completed-count")).toHaveText("1 Eintrag");
    const restored = stateSchema
      .parse(await (await request.get("/api/state")).json())
      .items.find((row) => row.id === milk.id);
    expect(restored).toMatchObject({
      name: "Milk",
      note: "Organic",
      completed: true,
      hasPhoto: true,
    });
    expect(await (await request.get(`/api/items/${milk.id}/photo`)).body()).toEqual(photo);
    expect(
      itemHistorySchema.parse(await (await request.get(`/api/lists/${list.id}/history`)).json())
        .oftenBought,
    ).toEqual([{ name: "MILK", completionCount: 1 }]);
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});

test("manage suggestions searches history and history-only forgetting supports Undo", async ({
  page,
  request,
  context,
}) => {
  await request.post("/api/session", { data: testCredentials });
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (
      await request.post("/api/lists", { data: { name: "Manage " + crypto.randomUUID() } })
    ).json(),
  );
  for (const name of ["Bread", "Coffee"]) {
    const item = addItemResultSchema.parse(
      await (await request.post(`/api/lists/${list.id}/items`, { data: { name } })).json(),
    );
    await request.patch(`/api/items/${item.id}`, { data: { completed: true } });
    await request.delete(`/api/items/${item.id}`);
  }
  const completed = addItemResultSchema.parse(
    await (
      await request.post(`/api/lists/${list.id}/items`, { data: { name: "Milk", note: "Keep me" } })
    ).json(),
  );
  await request.patch(`/api/items/${completed.id}`, { data: { completed: true } });
  try {
    await page.goto(`/lists/${list.id}`);
    await page.getByRole("button", { name: "Weitere Optionen" }).click();
    await page.getByRole("button", { name: "Vorschläge verwalten", exact: true }).click();
    const manager = page.getByRole("dialog", { name: "Vorschläge verwalten" });
    const search = manager.getByRole("textbox", { name: "Vorschläge suchen" });
    await expect(search).toBeFocused();
    await page.screenshot({ path: test.info().outputPath("manage-suggestions.png") });
    await search.fill("cof");
    await expect(manager.getByRole("button", { name: "Vorschlag vergessen: Bread" })).toHaveCount(
      0,
    );
    await manager.getByRole("button", { name: "Vorschlag vergessen: Coffee" }).click();
    await expect(page.getByRole("dialog", { name: "Eintrag vergessen?" })).toHaveCount(0);
    await expect(manager).toContainText("Keine passenden Vorschläge.");
    await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
    await expect(
      manager.getByRole("button", { name: "Vorschlag vergessen: Coffee" }),
    ).toBeVisible();
    const history = itemHistorySchema.parse(
      await (await request.get(`/api/lists/${list.id}/history`)).json(),
    );
    expect(history.oftenBought.find((item) => item.name === "Coffee")?.completionCount).toBe(1);
    await search.fill("Milk");
    await manager.getByRole("button", { name: "Vorschlag vergessen: Milk" }).click();
    await page
      .getByRole("dialog", { name: "Eintrag vergessen?" })
      .getByRole("button", { name: "Eintrag vergessen", exact: true })
      .click();
    await expect(manager).toContainText("Keine passenden Vorschläge.");
    await manager.getByRole("button", { name: "Rückgängig", exact: true }).click();
    await expect(manager.getByRole("button", { name: "Vorschlag vergessen: Milk" })).toBeVisible();
    expect(
      stateSchema
        .parse(await (await request.get("/api/state")).json())
        .items.find((item) => item.id === completed.id),
    ).toMatchObject({ completed: true, note: "Keep me" });
    await manager.getByRole("button", { name: "Schließen", exact: true }).click();
    await expect(page.getByRole("button", { name: "Weitere Optionen" })).toBeFocused();
    // Keyboard users can tab from the input to a separate forget action.
    const input = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
    await input.fill("Bread");
    await input.press("Tab");
    await expect(
      page.getByRole("button", { name: "Vorschlag vergessen: Bread", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(input).toBeFocused();
    await expect(page.getByRole("grid")).toBeHidden();
    await input.fill("Brea");
    await input.press("Tab");
    await expect(
      page.getByRole("button", { name: "Vorschlag vergessen: Bread", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    const removalToast = page.getByRole("region", { name: "Benachrichtigung" }).filter({
      has: page.getByRole("button", { name: "Rückgängig", exact: true }),
    });
    await expect(removalToast).toContainText("Vorschlag entfernt.");
    await expect(input).toBeFocused();
    await removalToast.getByRole("button", { name: "Rückgängig", exact: true }).click();
    await expect
      .poll(
        async () =>
          itemHistorySchema.parse(await (await request.get(`/api/lists/${list.id}/history`)).json())
            .names,
      )
      .toContain("Bread");
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});
