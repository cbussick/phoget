import { expect, type Page } from "@playwright/test";
import { installFirefoxNavigation, test } from "./browserTest";
import AxeBuilder from "@axe-core/playwright";
import { addItemResultSchema, listSchema, stateSchema } from "../shared/contracts";

import { testCredentials } from "./testCredentials";
const createdListIds: string[] = [];
test.beforeEach(async ({ request, context }) => {
  const result = await request.post("/api/session", { data: testCredentials });
  expect(result.status()).toBe(200);
  await context.addCookies((await request.storageState()).cookies);
});
test.afterEach(async ({ playwright, request }) => {
  const cleanup = await playwright.request.newContext({
    baseURL: `http://127.0.0.1:${process.env.PHOGET_TEST_PORT}`,
    extraHTTPHeaders: { "X-Phoget-Request": "1" },
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
  await expect(page).toHaveTitle("Alle Listen | Don't Phoget");
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
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const id = page.url().split("/").pop()!;
  createdListIds.push(id);
  return id;
}
for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test(`list controls remain usable while scrolling at ${viewport.width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize(viewport);
    const response = await request.post("/api/lists", {
      data: { name: "Sticky controls " + crypto.randomUUID() },
    });
    expect(response.status()).toBe(201);
    const list = listSchema.parse(await response.json());
    createdListIds.push(list.id);
    for (let index = 0; index < 30; index++) {
      const item = await request.post(`/api/lists/${list.id}/items`, {
        data: { name: `Scroll item ${index}` },
      });
      expect(item.status()).toBe(201);
    }
    const suggestionResponse = await request.post(`/api/lists/${list.id}/items`, {
      data: { name: "Hafermilch" },
    });
    expect(suggestionResponse.status()).toBe(201);
    const suggestion = addItemResultSchema.parse(await suggestionResponse.json());
    const completed = await request.patch(`/api/items/${suggestion.id}`, {
      data: { completed: true },
    });
    expect(completed.status()).toBe(200);
    await page.goto(`/lists/${list.id}`);
    await expect(page.locator(".active-items > li")).toHaveCount(30);
    await expect(page.getByRole("button", { name: "+ Hafermilch", exact: true })).toBeVisible();
    const input = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
    await expect(input).toHaveCSS("text-overflow", "ellipsis");
    await expect(page.locator("body")).toHaveCSS("background-image", "none");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(243, 246, 244)");
    await expect(page.locator(".list-controls")).toHaveCSS(
      "background-color",
      "rgb(243, 246, 244)",
    );
    const back = await page.locator(".back-link").boundingBox();
    expect(back!.y).toBe(8);
    const composer = await page.locator(".list-composer").boundingBox();
    const items = await page.locator(".list-items-card").boundingBox();
    expect(items!.y).toBeCloseTo(composer!.y + composer!.height, 1);
    await expect(page.locator(".list-composer")).toHaveCSS("border-bottom-width", "0px");
    const controls = [
      page.getByRole("heading", { name: list.name, exact: true }),
      page.locator(".back-link"),
      page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true }),
      page.getByRole("button", { name: "Hinzufügen", exact: true }),
      page.getByRole("button", { name: "+ Hafermilch", exact: true }),
    ];
    const initialBounds = await Promise.all(controls.map((control) => control.boundingBox()));
    const activeItems = page.getByRole("tabpanel", { name: "Offen", exact: true });
    const firstItem = activeItems.locator("li").first();
    const firstItemBounds = await firstItem.boundingBox();
    for (const position of [1, 12, 700, 100000, 12, 1, 0]) {
      await activeItems.evaluate((element, y) => element.scrollTo(0, y), position);
      if (position === 100000) {
        await expect
          .poll(() => activeItems.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(700);
      } else {
        await expect
          .poll(() => activeItems.evaluate((element) => element.scrollTop))
          .toBe(position);
      }
      for (const [index, control] of controls.entries()) {
        await expect(control).toBeInViewport({ ratio: 1 });
        expect(await control.boundingBox()).toEqual(initialBounds[index]);
      }
      const scrolledItem = await firstItem.boundingBox();
      const scrollTop = await activeItems.evaluate((element) => element.scrollTop);
      expect(scrolledItem!.y).toBeCloseTo(firstItemBounds!.y - scrollTop, 1);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    }
    await activeItems.evaluate((element) => element.scrollTo(0, 700));
    await page
      .getByRole("combobox", { name: "Eintrag hinzufügen", exact: true })
      .fill("Added while scrolled");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
    await expect(page.locator(".active-items > li")).toHaveCount(31);
    await expect(
      page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true }),
    ).toHaveValue("");
    await page.locator(".back-link").click();
    await expect(page.getByRole("heading", { name: "Alle Listen", exact: true })).toBeVisible();
  });
}

for (const width of [390, 768, 1280]) {
  test(`overview controls remain usable while scrolling at ${width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    for (let index = 0; index < 20; index++) {
      const response = await request.post("/api/lists", {
        data: { name: `Overview scroll ${index} ${crypto.randomUUID()}` },
      });
      expect(response.status()).toBe(201);
      createdListIds.push(listSchema.parse(await response.json()).id);
    }
    await page.goto("/");
    const pane = page.getByRole("region", { name: "Eure Listen", exact: true });
    const header = page.locator(".lists-header");
    const initialBounds = await header.boundingBox();
    const firstRow = pane.locator("li").first();
    const initialRowBounds = await firstRow.boundingBox();
    await pane.evaluate((element) => element.scrollTo(0, 500));
    await expect.poll(() => pane.evaluate((element) => element.scrollTop)).toBe(500);
    expect(await header.boundingBox()).toEqual(initialBounds);
    expect((await firstRow.boundingBox())!.y).toBeCloseTo(initialRowBounds!.y - 500, 1);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.getByRole("heading", { name: "Alle Listen", exact: true })).toBeInViewport({
      ratio: 1,
    });
    await page.getByRole("button", { name: "Neue Liste", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
    await pane.focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("Control+Home");
    await expect.poll(() => pane.evaluate((element) => element.scrollTop)).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test("completed tab uses the remaining viewport without moving the header or tabs", async ({
  browser,
  browserName,
  baseURL,
  request,
}, testInfo) => {
  const response = await request.post("/api/lists", { data: { name: "Supermarkt" } });
  expect(response.status()).toBe(201);
  const list = listSchema.parse(await response.json());
  createdListIds.push(list.id);
  for (let index = 0; index < 54; index++) {
    const response = await request.post(`/api/lists/${list.id}/items`, {
      data: { name: `Eintrag ${String(index).padStart(2, "0")}` },
    });
    expect(response.status()).toBe(201);
    const item = addItemResultSchema.parse(await response.json());
    if (index >= 3) {
      const completed = await request.patch(`/api/items/${item.id}`, {
        data: { completed: true },
      });
      expect(completed.status()).toBe(200);
    }
  }
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: browserName !== "firefox",
    hasTouch: true,
    storageState: await request.storageState(),
    extraHTTPHeaders: { "X-Phoget-Request": "1" },
  });
  await installFirefoxNavigation(context, browserName);
  const page = await context.newPage();
  try {
    await page.goto("/");
    await page.getByRole("link", { name: list.name, exact: true }).click();
    await expect(page.getByRole("tab", { name: "Offen", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.getByRole("tab", { name: "Erledigt", exact: true }).click();
    await expect(page.locator(".quick-add button")).toHaveCount(3);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    const visiblePositions = () =>
      page.evaluate(() => {
        const offset = window.visualViewport?.offsetTop ?? 0;
        return Array.from(
          document.querySelectorAll(
            ".back-link, .list-controls h1, .list-controls .list-icon, .add-item-form, .quick-add, .list-status-tab-list, .mobile-nav",
          ),
        ).map((element) => ({
          selector: element.className || element.tagName,
          top: element.getBoundingClientRect().top - offset,
        }));
      });
    const before = await visiblePositions();
    await testInfo.attach("before-scroll", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    const completedItems = page.getByRole("tabpanel", { name: "Erledigt", exact: true });
    await expect(page.locator(".active-items")).toHaveCount(0);
    await expect(page.locator("details")).toHaveCount(0);
    const bounds = await completedItems.boundingBox();
    expect(bounds!.height).toBeGreaterThan(200);
    expect(await completedItems.evaluate((element) => element.scrollWidth)).toBe(
      await completedItems.evaluate((element) => element.clientWidth),
    );
    await page.mouse.move(
      bounds!.x + bounds!.width / 2,
      Math.min(bounds!.y + bounds!.height / 2, 700),
    );
    // Mobile WebKit does not expose wheel input through Playwright.
    const scrollDown = () =>
      browserName === "webkit"
        ? completedItems.evaluate((element) => element.scrollBy(0, 1400))
        : page.mouse.wheel(0, 1400);
    // Firefox limits each wheel event to the small scroll area's page size.
    await expect
      .poll(
        async () => {
          await scrollDown();
          return completedItems.evaluate((element) => element.scrollTop);
        },
        { intervals: [100] },
      )
      .toBeGreaterThan(1000);
    await testInfo.attach("after-scroll", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    for (const [index, position] of (await visiblePositions()).entries()) {
      // Transformed icon bounds may differ by floating-point rounding in WebKit.
      expect(position.top).toBeCloseTo(before[index]!.top, 2);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  } finally {
    await context.close();
  }
});

test("overview hides update activity while list detail retains it", async ({ page, request }) => {
  const response = await request.post("/api/lists", {
    data: { name: "Activity visibility " + crypto.randomUUID(), description: "Shared list" },
  });
  expect(response.status()).toBe(201);
  const list = listSchema.parse(await response.json());
  createdListIds.push(list.id);
  await page.goto("/index.html");
  await page.getByRole("link", { name: "Alle Listen" }).last().click();
  const row = page.locator(".list-row").filter({ hasText: list.name });
  await expect(row).toBeVisible();
  await expect(row.locator(".list-activity")).toHaveCount(0);
  await row.click();
  await expect(page.locator(".list-meta time")).toContainText("aktualisiert");
});

test("complete household workflow persists through reload and a second browser", async ({
  page,
  browser,
  request,
  browserName,
}) => {
  test.setTimeout(browserName === "webkit" ? 240_000 : 180_000); // Cross-browser sync now takes up to 10 seconds per change.
  const errors: string[] = [];
  const sessionTraffic: string[] = [];
  const record = (event: string) => {
    sessionTraffic.push(`${new Date().toISOString()} ${event}`);
    if (sessionTraffic.length > 40) sessionTraffic.shift();
  };
  page.on("pageerror", (error) => {
    errors.push(error.message);
    record(`pageerror ${error.message}`);
  });
  const started = new WeakMap<object, number>();
  page.on("request", (request) => {
    if (request.isNavigationRequest() || new URL(request.url()).pathname === "/api/session")
      started.set(request, Date.now());
  });
  page.on("requestfailed", (request) => {
    if (request.isNavigationRequest() || new URL(request.url()).pathname === "/api/session")
      record(
        `${request.method()} ${new URL(request.url()).pathname} failed after ${Date.now() - (started.get(request) ?? Date.now())}ms: ${request.failure()?.errorText}`,
      );
  });
  page.on("response", (response) => {
    const request = response.request();
    if (request.isNavigationRequest() || new URL(request.url()).pathname === "/api/session")
      record(
        `${request.method()} ${new URL(request.url()).pathname} HTTP ${response.status()} after ${Date.now() - (started.get(request) ?? Date.now())}ms`,
      );
  });
  const name = "Weekend " + crypto.randomUUID();
  const id = await createList(page, name);
  const second = await browser.newPage();
  await installFirefoxNavigation(second.context(), browserName);
  await second.context().addCookies((await page.context().storageState()).cookies);
  try {
    await second.goto(`http://127.0.0.1:${process.env.PHOGET_TEST_PORT}/lists/${id}`, {
      waitUntil: "commit",
    });
    await expect(second.getByRole("heading", { name, level: 1 })).toBeVisible();
    await page
      .getByRole("combobox", { name: "Eintrag hinzufügen", exact: true })
      .fill("Pack towels");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
    await expect(second.getByRole("button", { name: "Pack towels", exact: true })).toBeVisible({
      timeout: 15_000,
    });
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
    await expect(page.getByRole("tab", { name: "Erledigt", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Erledigt", exact: true }).click();
    await expect(
      page.getByRole("checkbox", { name: "Pack two towels als offen markieren", exact: true }),
    ).toBeChecked();
    await expect(second.getByRole("tab", { name: "Erledigt", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await second.getByRole("tab", { name: "Erledigt", exact: true }).click();
    await expect(
      second.getByRole("checkbox", { name: "Pack two towels als offen markieren", exact: true }),
    ).toBeChecked();
    await second
      .getByRole("checkbox", { name: "Pack two towels als offen markieren", exact: true })
      .click();
    await page.getByRole("tab", { name: "Offen", exact: true }).click();
    await expect(page.locator(".active-items")).toContainText("Pack two towels", {
      timeout: 15_000,
    });
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
    await expect(page.getByRole("tab", { name: "Erledigt", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Bananas", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Erledigt", exact: true }).click();
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
    await page.getByRole("tab", { name: "Offen", exact: true }).click();
    await page.getByRole("button", { name: "Bananas", exact: true }).click();
    await page.getByRole("button", { name: "Eintrag entfernen", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    const combo = page.getByRole("combobox", { name: "Eintrag hinzufügen", exact: true });
    await combo.fill("ban");
    await expect(
      page.getByRole("grid").getByRole("button", { name: "Bananas", exact: true }),
    ).toBeVisible();
    await combo.press("ArrowDown");
    await combo.press("Enter");
    await expect(combo).toHaveValue("Bananas");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
    await expect(page.getByRole("button", { name: "Bananas", exact: true })).toBeVisible();
    const more = page.getByRole("button", { name: "Weitere Optionen", exact: true });
    await expect(more.locator("svg")).toBeVisible();
    await expect(more.locator("svg")).toHaveAttribute("aria-hidden", "true");
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
    ).toBeVisible({ timeout: 15_000 });
    expect(errors, `Session traffic (latest 40 events):\n${sessionTraffic.join("\n")}`).toEqual([]);
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
    await expect(page.getByRole("region", { name: "Benachrichtigung" })).toContainText(
      "Test connection failure",
    );
    await expect(input).toHaveValue("Keep this draft");
    await page.unroute("**/api/lists/*/items");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
    const item = page.getByRole("button", { name: "Keep this draft", exact: true });
    await item.click();
    await expect(page.getByRole("button", { name: "Dialog schließen" })).toBeFocused();
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
    await expect(itemField).toBeFocused();
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
test("selected list icon appears beside the detail heading and updates after editing", async ({
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
    expect(iconBounds!.x + iconBounds!.width).toBeLessThan(headingBounds!.x);
    expect(headingBounds!.y).toBeLessThan(iconBounds!.y + iconBounds!.height);
    expect(headingBounds!.y + headingBounds!.height).toBeGreaterThan(iconBounds!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test("household settings persist and update the household overview", async ({ page, request }) => {
  const original = stateSchema.parse(await (await request.get("/api/state")).json()).settings;
  const { id: _, ...body } = original;
  try {
    await page.goto("/settings");
    await page.getByRole("tab", { name: "Haushalt", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Name des Haushalts", exact: true })
      .fill("Our little home");
    await expect(page.getByRole("textbox", { name: /Häufig gekauft/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
    await expect(page.getByRole("region", { name: "Benachrichtigung" })).toContainText(
      "Einstellungen gespeichert.",
    );
    await page.reload();
    await page.getByRole("tab", { name: "Haushalt", exact: true }).click();
    await expect(page.getByRole("region", { name: "Haushaltsübersicht" })).toContainText(
      "Our little home",
    );
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
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toHaveText(list.name);
      await expect(heading).toHaveAttribute("title", list.name);
      const headingBounds = await heading.boundingBox();
      expect(headingBounds!.height).toBeLessThan(40);
      await expect(page.getByRole("button", { name: "Hinzufügen", exact: true })).toBeInViewport({
        ratio: 1,
      });
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
    await page.getByRole("tab", { name: "Haushalt", exact: true }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: "Alle Listen", exact: true })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally {
    await request.delete("/api/lists/" + list.id);
  }
});
