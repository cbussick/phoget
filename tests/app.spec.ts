import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { listSchema, stateSchema } from "../shared/contracts";

import { testCredentials } from "./testCredentials";
const createdListIds: string[] = [];
test.beforeEach(async ({ request, context }) => {
  const result = await request.post("/api/session", { data: testCredentials });
  expect(result.status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
});
test.afterEach(async ({ playwright, request }) => {
  const cleanup = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3002",
    extraHTTPHeaders: { "X-Gather-Request": "1" },
    storageState: await request.storageState(),
  });
  try {
    for (const id of createdListIds.splice(0)) await cleanup.delete("/api/lists/" + id);
  } finally {
    await cleanup.dispose();
  }
});

async function createList(page: Page, name: string) {
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { name: "Alle Listen", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page).toHaveTitle("Alle Listen | Gather");
  await page.getByRole("button", { name: "Neue Liste", exact: true }).click();
  await page.getByLabel("Listenname", { exact: true }).fill(" ");
  await page.getByLabel("Beschreibung", { exact: true }).focus();
  await expect(page.locator(".field-error")).toHaveCount(0);
  await page.getByRole("button", { name: "Liste erstellen", exact: true }).click();
  await expect(page.locator(".field-error")).toHaveText("Gib einen Namen ein.");
  await page.getByLabel("Listenname", { exact: true }).fill(name);
  await page.getByLabel("Beschreibung", { exact: true }).fill("A shared test list");
  await page.getByRole("button", { name: "Liste erstellen", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("link", { name: name + " A shared test list" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const id = page.url().split("/").pop()!;
  createdListIds.push(id);
  return id;
}
test("complete household workflow persists through reload and a second browser", async ({
  page,
  browser,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const name = "Weekend " + crypto.randomUUID();
  const id = await createList(page, name);
  const second = await browser.newPage();
  await second.context().addCookies((await page.context().storageState()).cookies);
  try {
    await second.goto("http://127.0.0.1:3002/lists/" + id, { waitUntil: "commit" });
    await expect(second.getByRole("heading", { name, level: 1 })).toBeVisible();
    await page
      .getByRole("combobox", { name: "Eintrag hinzufügen", exact: true })
      .fill("Pack towels");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
    await expect(second.getByRole("button", { name: "Pack towels", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Pack towels", exact: true }).click();
    await expect(
      page.getByRole("checkbox", { name: "Pack towels als erledigt markieren", exact: true }),
    ).not.toBeChecked();
    await page.getByRole("textbox", { name: "Eintrag", exact: true }).fill("Pack two towels");
    await page.getByRole("textbox", { name: "Notiz", exact: true }).fill("The blue ones");
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.reload();
    await expect(page.getByRole("button", { name: "Pack two towels The blue ones" })).toBeVisible();
    const checkbox = page.getByRole("checkbox", {
      name: "Pack two towels als erledigt markieren",
      exact: true,
    });
    const checkboxBounds = await checkbox.boundingBox();
    expect(checkboxBounds!.width).toBe(32);
    expect(await checkbox.locator("..").boundingBox()).toEqual(checkboxBounds);
    await page.mouse.click(checkboxBounds!.x - 4, checkboxBounds!.y + checkboxBounds!.height / 2);
    await expect(checkbox).not.toBeChecked();
    await page
      .getByRole("checkbox", { name: "Pack two towels als erledigt markieren", exact: true })
      .click();
    await expect(page.locator(".completed-items summary")).toContainText("1 Eintrag");
    await page.locator(".completed-items summary").click();
    await expect(
      page.getByRole("checkbox", { name: "Pack two towels als offen markieren", exact: true }),
    ).toBeChecked();
    await expect(second.locator(".completed-items summary")).toContainText("1 Eintrag");
    await second.locator(".completed-items summary").click();
    await expect(
      second.getByRole("checkbox", { name: "Pack two towels als offen markieren", exact: true }),
    ).toBeChecked();
    await second
      .getByRole("checkbox", { name: "Pack two towels als offen markieren", exact: true })
      .click();
    await expect(page.locator(".active-items")).toContainText("Pack two towels");
    await page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true }).fill("Bananas");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
    await expect(page.getByRole("button", { name: "Bananas", exact: true })).toBeVisible();
    const divider = page.locator(".active-items .item-divider:visible");
    await expect(divider).toHaveCount(1);
    await expect(divider).toHaveCSS("border-radius", "0px");
    await expect(divider.locator("..")).toHaveCSS("border-top-width", "0px");
    await page
      .getByRole("checkbox", { name: "Bananas als erledigt markieren", exact: true })
      .click();
    await expect(page.locator(".completed-items")).toContainText("Bananas");
    await expect(page.getByRole("button", { name: "+ Bananas", exact: true })).toBeVisible();
    await page.locator(".completed-items summary").click();
    await page.getByRole("button", { name: "Bananas", exact: true }).click();
    await page.getByRole("button", { name: "Eintrag entfernen", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: "Bananas", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Bananas", exact: true })).toBeVisible();
    const addBounds = await page
      .getByRole("combobox", { name: "Eintrag hinzufügen", exact: true })
      .boundingBox();
    const oftenBounds = await page.locator(".quick-add").boundingBox();
    expect(oftenBounds!.y - addBounds!.y - addBounds!.height).toBeLessThan(60);
    const draftInput = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
    await draftInput.fill("Keep my draft");
    await draftInput.press("Escape");
    await page.getByRole("button", { name: "+ Bananas", exact: true }).click();
    await expect(page.getByRole("button", { name: "+ Bananas", exact: true })).toHaveCount(0);
    await expect(draftInput).not.toBeFocused();
    await expect(draftInput).toHaveAttribute("aria-expanded", "false");
    await expect(draftInput).toHaveValue("Keep my draft");
    await page.getByRole("button", { name: "Bananas", exact: true }).click();
    await page.getByRole("button", { name: "Eintrag entfernen", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    const combo = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
    await combo.fill("ban");
    await expect(page.getByRole("option", { name: "Bananas", exact: true })).toBeVisible();
    await combo.press("ArrowDown");
    await combo.press("Enter");
    await expect(combo).toHaveValue("Bananas");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
    await expect(page.getByRole("button", { name: "Bananas", exact: true })).toBeVisible();
    const more = page.getByRole("button", { name: "Weitere Optionen", exact: true });
    await expect(more.locator("circle").first()).toHaveAttribute("stroke", "none");
    await expect(more.locator("circle").first()).toHaveAttribute("fill", "currentColor");
    await more.click();
    await page.getByLabel("Listenname", { exact: true }).fill("Coast trip");
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Coast trip", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Weitere Optionen", exact: true }).click();
    await page.getByRole("button", { name: "Liste löschen", exact: true }).click();
    await page.getByRole("button", { name: "Liste löschen", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Alle Listen", exact: true })).toBeVisible();
    await expect(
      second.getByRole("heading", { name: "Liste nicht gefunden", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await second.close();
    await request.delete("/api/lists/" + id);
  }
});
test("failed saves retain input, whitespace is rejected, and keyboard dialog focus returns", async ({
  page,
  request,
}) => {
  const id = await createList(page, "Failure " + crypto.randomUUID());
  try {
    const input = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
    await input.fill("   ");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).focus();
    await expect(page.locator(".field-error")).toHaveCount(0);
    const addBeforeError = await page.locator(".add-item-form").boundingBox();
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
    expect(await page.locator(".add-item-form").boundingBox()).toEqual(addBeforeError);
    await expect(page.locator(".field-error")).toContainText("Gib einen Namen ein");
    await page.route("**/api/lists/*/items", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Test connection failure" }),
      }),
    );
    await input.fill("Keep this draft");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Test connection failure");
    await expect(input).toHaveValue("Keep this draft");
    await page.unroute("**/api/lists/*/items");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
    const item = page.getByRole("button", { name: "Keep this draft", exact: true });
    await item.click();
    await expect(page.getByRole("textbox", { name: "Eintrag", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(item).toBeFocused();
    await item.click();
    const itemField = page.getByRole("textbox", { name: "Eintrag", exact: true });
    await itemField.fill("");
    const dialogBeforeError = await page.getByRole("dialog").boundingBox();
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.getByRole("dialog").locator(".field-error")).toHaveText(
      "Gib einen Namen ein.",
    );
    expect(await page.getByRole("dialog").boundingBox()).toEqual(dialogBeforeError);
    await itemField.fill("Keep this draft");
    await expect(page.getByRole("textbox", { name: "Notiz", exact: true })).toHaveCSS(
      "resize",
      "none",
    );
    await page
      .getByRole("textbox", { name: "Notiz", exact: true })
      .fill('<script>alert("x")</script>');
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.locator(".item-note")).toHaveText('<script>alert("x")</script>');
  } finally {
    await request.delete("/api/lists/" + id);
  }
});
test("selected list icon appears above the detail heading and updates after editing", async ({
  page,
}) => {
  await createList(page, "Icon " + crypto.randomUUID());
  const icon = page.locator(".page-header > .list-icon");
  await expect(icon).toBeVisible();
  await expect(icon).toHaveAttribute("aria-hidden", "true");
  const originalPath = await icon.locator("path").first().getAttribute("d");

  await page.getByRole("button", { name: "Weitere Optionen" }).click();
  await page.getByRole("button", { name: "Herz", exact: true }).click();
  const selectedPath = await page
    .getByRole("button", { name: "Herz", exact: true })
    .locator("path")
    .first()
    .getAttribute("d");
  expect(selectedPath).not.toBe(originalPath);
  await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(icon.locator("path").first()).toHaveAttribute("d", selectedPath!);
  await page.reload();
  await expect(icon.locator("path").first()).toHaveAttribute("d", selectedPath!);

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const iconBounds = await icon.boundingBox();
    const headingBounds = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(iconBounds!.y + iconBounds!.height).toBeLessThan(headingBounds!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test("household settings persist and update the sidebar", async ({ page, request }) => {
  const original = stateSchema.parse(await (await request.get("/api/state")).json()).settings;
  const { id: _, ...body } = original;
  try {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Haushalt", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Name des Haushalts", exact: true })
      .fill("Our little home");
    await expect(page.getByRole("textbox", { name: /Häufig gekauft/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Einstellungen gespeichert.");
    await page.reload();
    await expect(page.locator(".household strong")).toHaveText("Our little home");
  } finally {
    await request.put("/api/settings", { data: body });
  }
});
test("initial load errors can be retried", async ({ page }) => {
  await page.route("**/api/state", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"Unavailable"}',
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Deine Listen konnten nicht geladen werden" }),
  ).toBeVisible();
  await page.unroute("**/api/state");
  await page.getByRole("button", { name: "Erneut versuchen" }).click();
  await expect(page.getByRole("heading", { name: "Alle Listen" })).toBeVisible();
});
test("mobile long content, dialog, and pages have no accessibility violations", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/lists", {
    data: { name: "Long " + "W".repeat(150), description: "D".repeat(300) },
  });
  const list = listSchema.parse(await response.json());
  createdListIds.push(list.id);
  try {
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/lists/" + list.id, { waitUntil: "commit" });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(list.name);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    await page.setViewportSize({ width: 320, height: 750 });
    await page.getByRole("button", { name: "Weitere Optionen" }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "Dialog schließen" }).click();
    await page.goto("/settings", { waitUntil: "commit" });
    await page.getByRole("button", { name: "Haushalt", exact: true }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: "Alle Listen", exact: true })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally {
    await request.delete("/api/lists/" + list.id);
  }
});
test("prototype geometry, type and colors match on desktop and mobile", async ({
  page,
  browser,
  request,
}, testInfo) => {
  const state = stateSchema.parse(await (await request.get("/api/state")).json());
  const weekly = state.lists.find((list) => list.name === "Weekly shop")!;
  // Both pages use the same licensed font file so remote Google Fonts availability cannot alter the comparison.
  const font = await readFile(
    "node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2",
  );
  const prototype = await browser.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prototype.emulateMedia({ reducedMotion: "reduce" });
  await prototype.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({
      contentType: "text/css",
      body: "@font-face {font-family:Nunito;font-style:normal;font-weight:200 1000;src:url(https://fonts.gstatic.com/gather.woff2) format('woff2')}",
    }),
  );
  await prototype.route("https://fonts.gstatic.com/**", (route) =>
    route.fulfill({ contentType: "font/woff2", body: font }),
  );
  const selectors = [
    "h1",
    ".main-content",
    ".sidebar",
    ".lists-card",
    ".list-overview a",
    ".list-icon",
    ".list-copy strong",
    ".list-copy span",
    ".list-card",
    ".add-item-form",
    ".item-row",
    ".item-name",
    ".item-note",
    ".completed-items",
    ".mobile-nav",
  ];
  async function geometry(target: Page) {
    return target.evaluate(
      (selectors) =>
        Object.fromEntries(
          selectors.flatMap((selector) => {
            const element = document.querySelector(selector);
            if (!element) return [];
            const style = getComputedStyle(element);
            if (style.display === "none") return [];
            const box = element.getBoundingClientRect();
            return [
              [
                selector,
                {
                  x: box.x,
                  y: box.y,
                  width: box.width,
                  height: box.height,
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  lineHeight: style.lineHeight,
                  color: style.color,
                  background: style.backgroundColor,
                },
              ],
            ];
          }),
        ),
      selectors,
    );
  }
  try {
    for (const width of [390, 1440])
      for (const screen of ["all-lists", "weekly"]) {
        await page.setViewportSize({ width, height: 1000 });
        await prototype.setViewportSize({ width, height: 1000 });
        await page.goto(screen === "weekly" ? "/lists/" + weekly.id : "/", {
          waitUntil: "commit",
        });
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          screen === "weekly" ? "Weekly shop" : "Alle Listen",
        );
        await prototype.goto(
          "http://127.0.0.1:4174/prototype/" +
            (screen === "weekly" ? "index.html" : "all-lists.html"),
        );
        await Promise.all([
          page.evaluate(() => document.fonts.ready),
          prototype.evaluate(() => document.fonts.ready),
        ]);
        const actual = await geometry(page),
          expected = await geometry(prototype);
        // The detail header now includes the selected icon above its title.
        if (screen === "weekly") {
          expected.h1.y += await page
            .locator(".page-header > .list-icon")
            .evaluate(
              (element) =>
                (element as HTMLElement).offsetHeight +
                parseFloat(getComputedStyle(element).marginBlockEnd),
            );
        }
        for (const [selector, values] of Object.entries(expected)) {
          const measured = actual[selector];
          expect(measured, selector).toBeDefined();
          // New row padding, the combobox/error slots and the Done separator
          // intentionally change content positions. Keep unchanged frame geometry
          // and all prototype typography/colors under comparison.
          // The German heading has a different intrinsic width than the English prototype.
          const dimensions =
            selector === "h1"
              ? (["x", "y", "height"] as const)
              : [".sidebar", ".mobile-nav"].includes(selector)
                ? (["x", "y", "width", "height"] as const)
                : [
                      ".main-content",
                      ".lists-card",
                      ".list-card",
                      ".list-overview a",
                      ".item-row",
                    ].includes(selector)
                  ? (["x", "width"] as const)
                  : selector === ".list-icon"
                    ? (["width", "height"] as const)
                    : [];
          for (const property of dimensions)
            expect(
              Math.abs(measured[property] - values[property]),
              selector + " " + property,
            ).toBeLessThan(1);
          for (const property of [
            "fontSize",
            "fontWeight",
            "lineHeight",
            "color",
            "background",
          ] as const)
            expect(measured[property], selector + " " + property).toEqual(values[property]);
        }
        await page.screenshot({
          path: testInfo.outputPath(screen + "-" + width + "-app.png"),
          fullPage: true,
        });
        await prototype.screenshot({
          path: testInfo.outputPath(screen + "-" + width + "-prototype.png"),
          fullPage: true,
        });
      }
  } finally {
    await prototype.close();
  }
});
