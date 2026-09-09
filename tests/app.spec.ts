import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { listSchema, stateSchema } from "../shared/contracts";

const createdListIds: string[] = [];
test.afterEach(async ({ playwright }) => {
  const cleanup = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3002" });
  try {
    for (const id of createdListIds.splice(0)) await cleanup.delete("/api/lists/" + id);
  } finally {
    await cleanup.dispose();
  }
});

async function createList(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "New list", exact: true }).click();
  await page.getByLabel("List name", { exact: true }).fill(name);
  await page.getByLabel("Description", { exact: true }).fill("A shared test list");
  await page.getByRole("button", { name: "Create list", exact: true }).click();
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
  try {
    await second.goto("http://127.0.0.1:3002/lists/" + id);
    await page.getByRole("textbox", { name: "Add an item", exact: true }).fill("Pack towels");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(second.getByRole("button", { name: "Pack towels", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Pack towels", exact: true }).click();
    await page.getByRole("textbox", { name: "Item", exact: true }).fill("Pack two towels");
    await page.getByRole("textbox", { name: "Note", exact: true }).fill("The blue ones");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.reload();
    await expect(page.getByRole("button", { name: "Pack two towels The blue ones" })).toBeVisible();
    await page.getByRole("checkbox", { name: "Mark Pack two towels done", exact: true }).click();
    await expect(page.locator(".completed-items summary")).toContainText("1 item");
    await page.locator(".completed-items summary").click();
    await expect(
      page.getByRole("checkbox", { name: "Mark Pack two towels not done", exact: true }),
    ).toBeChecked();
    await expect(second.locator(".completed-items summary")).toContainText("1 item");
    await second.locator(".completed-items summary").click();
    await expect(
      second.getByRole("checkbox", { name: "Mark Pack two towels not done", exact: true }),
    ).toBeChecked();
    await second
      .getByRole("checkbox", { name: "Mark Pack two towels not done", exact: true })
      .click();
    await expect(page.locator(".active-items")).toContainText("Pack two towels");
    await page.getByRole("button", { name: "+ Bananas", exact: true }).click();
    await expect(page.getByRole("button", { name: "Bananas", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Bananas", exact: true }).click();
    await page.getByRole("button", { name: "Remove item", exact: true }).click();
    await expect(page.getByRole("button", { name: "Bananas", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "More options", exact: true }).click();
    await page.getByLabel("List name", { exact: true }).fill("Coast trip");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Coast trip", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "More options", exact: true }).click();
    await page.getByRole("button", { name: "Delete list", exact: true }).click();
    await page.getByRole("button", { name: "Delete list", exact: true }).click();
    await expect(page.getByRole("heading", { name: "All lists", exact: true })).toBeVisible();
    await expect(
      second.getByRole("heading", { name: "List not found", exact: true }),
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
    const input = page.getByRole("textbox", { name: "Add an item", exact: true });
    await input.fill("   ");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Enter a name");
    await page.route("**/api/lists/*/items", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Test connection failure" }),
      }),
    );
    await input.fill("Keep this draft");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Test connection failure");
    await expect(input).toHaveValue("Keep this draft");
    await page.unroute("**/api/lists/*/items");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const item = page.getByRole("button", { name: "Keep this draft", exact: true });
    await item.click();
    await expect(page.getByRole("textbox", { name: "Item", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(item).toBeFocused();
    await item.click();
    await page
      .getByRole("textbox", { name: "Note", exact: true })
      .fill('<script>alert("x")</script>');
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.locator(".item-note")).toHaveText('<script>alert("x")</script>');
  } finally {
    await request.delete("/api/lists/" + id);
  }
});
test("household settings persist and update the sidebar", async ({ page, request }) => {
  const original = stateSchema.parse(await (await request.get("/api/state")).json()).settings;
  const { id: _, ...body } = original;
  try {
    await page.goto("/settings");
    await page
      .getByRole("textbox", { name: "Household name", exact: true })
      .fill("Our little home");
    await page.getByRole("textbox", { name: "First person", exact: true }).fill("Alex");
    await page.getByRole("textbox", { name: "Second person", exact: true }).fill("Sam");
    await page
      .getByRole("textbox", { name: "Often bought (one per line, up to 10)", exact: true })
      .fill("Tea\nApples");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Settings saved.");
    await page.reload();
    await expect(page.getByRole("textbox", { name: "First person", exact: true })).toHaveValue(
      "Alex",
    );
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
  await expect(page.getByRole("heading", { name: "Cannot load your lists" })).toBeVisible();
  await page.unroute("**/api/state");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "All lists" })).toBeVisible();
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
      await page.goto("/lists/" + list.id);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(list.name);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    await page.setViewportSize({ width: 320, height: 750 });
    await page.getByRole("button", { name: "More options" }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.goto("/settings");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto("/");
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
  await prototype.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({
      contentType: "text/css",
      body: "@font-face {font-family:Nunito;font-style:normal;font-weight:200 1000;src:url(https://fonts.gstatic.com/phoget.woff2) format('woff2')}",
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
    ".quick-add",
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
        await page.goto(screen === "weekly" ? "/lists/" + weekly.id : "/");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          screen === "weekly" ? "Weekly shop" : "All lists",
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
        for (const [selector, values] of Object.entries(expected)) {
          const measured = actual[selector];
          expect(measured, selector).toBeDefined();
          for (const property of ["x", "y", "width", "height"] as const)
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
