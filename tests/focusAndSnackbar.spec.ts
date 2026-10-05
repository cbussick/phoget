import { expect } from "@playwright/test";
import { test } from "./browserTest";
import AxeBuilder from "@axe-core/playwright";
import { listSchema, stateSchema } from "../shared/contracts";
import { testCredentials } from "./testCredentials";

test("adding preserves input focus only for Enter in the combobox; new icons persist", async ({
  page,
  request,
  context,
  browserName,
}) => {
  test.slow(browserName === "webkit", "Long multi-step workflow is slower in WebKit.");
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (
      await request.post("/api/lists", { data: { name: "Fokus " + crypto.randomUUID() } })
    ).json(),
  );
  try {
    await page.goto(`/lists/${list.id}`);
    await expect(page.locator(".list-meta")).toContainText("aktualisiert von Test Admin");
    const input = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
    const add = page.getByRole("button", { name: "Hinzufügen", exact: true });
    for (const method of ["input", "mouse", "button"] as const) {
      const name = method + crypto.randomUUID();
      await input.fill(name);
      if (method === "input") await input.press("Enter");
      else if (method === "mouse") await add.click();
      else {
        await add.focus();
        await add.press("Enter");
      }
      await expect(page.locator(".item-name").filter({ hasText: name })).toBeVisible();
      await expect(add).toBeEnabled();
      await expect(input).toHaveValue("");
      if (method === "input") await expect(input).toBeFocused();
      else await expect(input).not.toBeFocused();
    }
    for (const [label, value] of [
      ["Einkaufswagen", "cart"],
      ["Seifenblasen", "bubbles"],
      ["Putzen", "cleaning"],
      ["Innenstadt", "city"],
      ["Asia-Supermarkt", "rice"],
      ["Nähen", "sewing"],
    ]) {
      await page.getByRole("button", { name: "Weitere Optionen" }).click();
      await page
        .getByRole("group", { name: "Symbol", exact: true })
        .getByRole("button", { name: label, exact: true })
        .click();
      await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
      const saved = stateSchema.parse(await (await request.get("/api/state")).json());
      expect(saved.lists.find((entry) => entry.id === list.id)?.icon).toBe(value);
    }
    await page.goto("/");
    await expect(page.getByRole("link", { name: list.name, exact: true })).toBeVisible();
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});

test("opening an entry avoids text focus and retains keyboard editing and focus restoration", async ({
  page,
  request,
  context,
}) => {
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (
      await request.post("/api/lists", { data: { name: "Dialog focus " + crypto.randomUUID() } })
    ).json(),
  );
  try {
    expect(
      (await request.post(`/api/lists/${list.id}/items`, { data: { name: "Milk" } })).status(),
    ).toBe(201);
    await page.setViewportSize({ width: 320, height: 750 });
    await page.goto(`/lists/${list.id}`);
    const item = page.getByRole("button", { name: "Milk", exact: true });
    const dialog = page.getByRole("dialog");
    const name = dialog.getByRole("textbox", { name: "Eintrag", exact: true });
    for (const method of ["pointer", "keyboard"] as const) {
      if (method === "pointer") await item.click();
      else await item.press("Enter");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Dialog schließen" })).toBeFocused();
      await expect(name).not.toBeFocused();
      await expect(dialog.getByRole("textbox", { name: "Notiz", exact: true })).not.toBeFocused();
      await page.keyboard.press("Tab");
      await expect(name).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(item).toBeFocused();
    }
    await page.getByRole("button", { name: "Weitere Optionen" }).click();
    await expect(dialog.getByRole("textbox", { name: "Listenname", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});

test("settings success uses a dismissible snackbar without shifting the form", async ({
  page,
  request,
  context,
}) => {
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
  await page.goto("/settings");
  for (const name of ["Mein Konto", "Haushalt", "Benutzer"]) {
    await expect(
      page
        .getByRole("navigation", { name: "Einstellungsbereiche" })
        .getByRole("button", { name, exact: true })
        .locator("svg"),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Haushalt", exact: true }).click();
  const save = page.getByRole("button", { name: "Änderungen speichern", exact: true });
  const before = await page.locator(".settings-form").boundingBox();
  await save.click();
  const snackbar = page.getByRole("region", { name: "Benachrichtigung" });
  await expect(snackbar).toBeVisible();
  await expect(snackbar).toContainText("Einstellungen gespeichert.");
  expect(await page.locator(".settings-form").boundingBox()).toEqual(before);
  await expect(page.locator("[data-sonner-toaster]")).toHaveCSS("position", "fixed");
  await expect(snackbar).toHaveAttribute("data-variant", "success");
  await expect(snackbar.locator(".snackbar-message")).toHaveCSS(
    "border-left-color",
    "rgb(39, 103, 73)",
  );
  await expect(page.locator(".settings-form")).toHaveCSS("row-gap", "12px");
  await expect(page.locator(".settings-form .form-field")).toHaveCSS("row-gap", "4px");
  await expect(snackbar.getByRole("button")).not.toBeFocused();
  await page.setViewportSize({ width: 320, height: 900 });
  const reserved = page.locator(".settings-form .field-error-space");
  expect(
    await reserved.evaluate((element) => Math.round(element.getBoundingClientRect().height)),
  ).toBe(21);
  // Sonner pauses dismissal while hovered, so the accessibility audit cannot
  // consume the five-second window for testing the dismiss button.
  await snackbar.hover();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await snackbar.getByRole("button", { name: "Meldung schließen" }).click();
  await expect(snackbar).toBeHidden();
});
