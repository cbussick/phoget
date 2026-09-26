import { expect } from "@playwright/test";
import { test } from "./browserTest";
import { testCredentials } from "./testCredentials";
import { stateSchema, itemSchema, listSchema } from "../shared/contracts";

test("overview drag handle does not overlap the list link on iPad", async ({
  page,
  request,
  context,
}) => {
  const session = await request.post("/api/session", { data: testCredentials });
  expect(session.ok()).toBeTruthy();
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (await request.post("/api/lists", { data: { name: "Handle clearance" } })).json(),
  );
  try {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/");
    const row = page
      .locator(".list-overview .sortable-row")
      .filter({ hasText: "Handle clearance" });
    const handle = row.getByRole("button", { name: "Handle clearance verschieben" });
    const link = row.getByRole("link", { name: "Handle clearance" });
    const handleBox = await handle.boundingBox();
    const linkBox = await link.boundingBox();
    expect(handleBox && linkBox).toBeTruthy();
    expect(handleBox!.x + handleBox!.width).toBeLessThanOrEqual(linkBox!.x + 0.5);
    const hit = await handle.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return node.contains(
        document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
      );
    });
    expect(hit).toBe(true);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`));
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});

test("dragging past either end stays within the list", async ({ page, request, context }) => {
  const session = await request.post("/api/session", { data: testCredentials });
  expect(session.ok()).toBeTruthy();
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (await request.post("/api/lists", { data: { name: "Bounded drag" } })).json(),
  );
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const rows = page.locator(".list-overview .sortable-row");
    const container = page.locator(".list-overview");
    for (const direction of ["up", "down"] as const) {
      const row = direction === "up" ? rows.first() : rows.last();
      await row.scrollIntoViewIfNeeded();
      const handle = await row.locator(".sort-handle").boundingBox();
      expect(handle).not.toBeNull();
      const original = await container.boundingBox();
      expect(original).not.toBeNull();
      const cardHeight = await page
        .locator(".lists-card")
        .evaluate((node) => node.getBoundingClientRect().height);
      const startX = handle!.x + handle!.width / 2;
      const startY = handle!.y + handle!.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX, startY + (direction === "up" ? -900 : 900), { steps: 12 });
      const dragged = await row.boundingBox();
      const bounds = await container.boundingBox();
      expect(dragged!.y).toBeGreaterThanOrEqual(bounds!.y - 2);
      expect(dragged!.y + dragged!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height + 2);
      expect(
        await page.locator(".lists-card").evaluate((node) => node.getBoundingClientRect().height),
      ).toBeCloseTo(cardHeight, 0);
      await page.mouse.up();
    }
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});

test("dragging a row sideways cannot shift it or widen the page", async ({
  page,
  request,
  context,
}) => {
  const session = await request.post("/api/session", { data: testCredentials });
  expect(session.ok()).toBeTruthy();
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (await request.post("/api/lists", { data: { name: "Sideways drag" } })).json(),
  );
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const row = page.locator(".sortable-row").filter({ hasText: "Sideways drag" });
    const before = await row.boundingBox();
    expect(before).not.toBeNull();
    const handle = await row
      .getByRole("button", { name: "Sideways drag verschieben" })
      .boundingBox();
    expect(handle).not.toBeNull();
    await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle!.x + 450, handle!.y + handle!.height / 2, { steps: 8 });
    const during = await row.boundingBox();
    expect(Math.abs(during!.x - before!.x)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await page.mouse.up();
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});

test("dragging item text reorders without opening the editor or toggling the checkbox", async ({
  page,
  request,
  context,
}) => {
  const session = await request.post("/api/session", { data: testCredentials });
  expect(session.ok()).toBeTruthy();
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (await request.post("/api/lists", { data: { name: "Drag text" } })).json(),
  );
  try {
    const a = itemSchema.parse(
      await (
        await request.post(`/api/lists/${list.id}/items`, { data: { name: "Drag A" } })
      ).json(),
    );
    const b = itemSchema.parse(
      await (
        await request.post(`/api/lists/${list.id}/items`, { data: { name: "Drag B" } })
      ).json(),
    );
    await page.goto(`/lists/${list.id}`);
    const source = await page.getByRole("button", { name: "Drag B", exact: true }).boundingBox();
    const target = await page.getByRole("button", { name: "Drag A", exact: true }).boundingBox();
    expect(source && target).toBeTruthy();
    await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
    await page.mouse.down();
    await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, {
      steps: 12,
    });
    await page.mouse.up();
    await expect
      .poll(async () =>
        stateSchema
          .parse(await (await request.get("/api/state")).json())
          .items.filter((i) => i.listId === list.id)
          .map((i) => i.id),
      )
      .toEqual([b.id, a.id]);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("checkbox", { name: "Drag B als erledigt markieren" }),
    ).not.toBeChecked();
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});

test("long touch hold on the handle drags without selecting text or opening the editor", async ({
  browser,
  request,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Synthetic touch event probe runs in Chromium; manual device check remains required.",
  );
  const session = await request.post("/api/session", { data: testCredentials });
  expect(session.ok()).toBeTruthy();
  const list = listSchema.parse(
    await (await request.post("/api/lists", { data: { name: "Touch reorder" } })).json(),
  );
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    baseURL: `http://127.0.0.1:${process.env.PHOGET_TEST_PORT}`,
    storageState: await request.storageState(),
  });
  try {
    const a = itemSchema.parse(
      await (
        await request.post(`/api/lists/${list.id}/items`, { data: { name: "Touch A" } })
      ).json(),
    );
    const b = itemSchema.parse(
      await (
        await request.post(`/api/lists/${list.id}/items`, { data: { name: "Touch B" } })
      ).json(),
    );
    const page = await context.newPage();
    await page.goto(`/lists/${list.id}`);
    const handle = page.getByRole("button", { name: "Touch B verschieben" });
    await expect(handle).toHaveCSS("user-select", "none");
    await expect(handle).toHaveCSS("touch-action", "none");
    const source = await handle.boundingBox();
    const target = await page.getByRole("button", { name: "Touch A verschieben" }).boundingBox();
    expect(source && target).toBeTruthy();
    const sx = source!.x + source!.width / 2;
    const sy = source!.y + source!.height / 2;
    const tx = target!.x + target!.width / 2;
    const ty = target!.y + target!.height / 2;
    const text = await page.getByRole("button", { name: "Touch B", exact: true }).boundingBox();
    expect(text).not.toBeNull();
    await page.evaluate(
      async ({ x, y, ty }) => {
        const node = document.elementFromPoint(x, y)!;
        const fire = (type: string, cy: number) => {
          const touch = new Touch({ identifier: 1, target: node, clientX: x, clientY: cy });
          node.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches: type === "touchend" ? [] : [touch],
              targetTouches: type === "touchend" ? [] : [touch],
              changedTouches: [touch],
            }),
          );
        };
        fire("touchstart", y);
        await new Promise((resolve) => setTimeout(resolve, 320));
        fire("touchmove", ty);
        fire("touchend", ty);
      },
      { x: text!.x + text!.width / 2, y: text!.y + text!.height / 2, ty },
    );
    const itemIds = async () =>
      stateSchema
        .parse(await (await request.get("/api/state")).json())
        .items.filter((i) => i.listId === list.id)
        .map((i) => i.id);
    expect(await itemIds()).toEqual([a.id, b.id]);
    await page.evaluate(
      async ({ sx, sy, tx, ty }) => {
        const node = document.elementFromPoint(sx, sy)!;
        const touch = (x: number, y: number) =>
          new Touch({ identifier: 1, target: node, clientX: x, clientY: y });
        const fire = (type: string, x: number, y: number) =>
          node.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches: type === "touchend" ? [] : [touch(x, y)],
              targetTouches: type === "touchend" ? [] : [touch(x, y)],
              changedTouches: [touch(x, y)],
            }),
          );
        fire("touchstart", sx, sy);
        await new Promise((resolve) => setTimeout(resolve, 1100));
        for (let i = 1; i <= 10; i++) {
          fire("touchmove", sx + ((tx - sx) * i) / 10, sy + ((ty - sy) * i) / 10);
          await new Promise((resolve) => setTimeout(resolve, 16));
        }
        fire("touchend", tx, ty);
      },
      { sx, sy, tx, ty },
    );
    await expect.poll(itemIds).toEqual([b.id, a.id]);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally {
    await context.close();
    await request.delete(`/api/lists/${list.id}`);
  }
});

test("keyboard handle reorders lists and items without changing row actions", async ({
  page,
  request,
  context,
}) => {
  const session = await request.post("/api/session", { data: testCredentials });
  expect(session.ok()).toBeTruthy();
  await context.addCookies((await request.storageState()).cookies);
  const one = listSchema.parse(
    await (await request.post("/api/lists", { data: { name: "Sort one" } })).json(),
  );
  const two = listSchema.parse(
    await (await request.post("/api/lists", { data: { name: "Sort two" } })).json(),
  );
  try {
    await page.goto("/");
    const handle = page.getByRole("button", { name: "Sort two verschieben" });
    await handle.focus();
    await page.keyboard.press("Space");
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Space");
    await expect
      .poll(async () => {
        const ids = stateSchema
          .parse(await (await request.get("/api/state")).json())
          .lists.map((l) => l.id);
        return ids.indexOf(two.id) < ids.indexOf(one.id);
      })
      .toBe(true);
    await expect(page.getByRole("link", { name: "Sort two", exact: true })).toBeVisible();
    const a = itemSchema.parse(
      await (await request.post(`/api/lists/${one.id}/items`, { data: { name: "Sort A" } })).json(),
    );
    const b = itemSchema.parse(
      await (await request.post(`/api/lists/${one.id}/items`, { data: { name: "Sort B" } })).json(),
    );
    await page.goto(`/lists/${one.id}`);
    await page.getByRole("button", { name: "Sort B verschieben" }).focus();
    await page.keyboard.press("Space");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Space");
    await expect
      .poll(async () =>
        stateSchema
          .parse(await (await request.get("/api/state")).json())
          .items.filter((i) => i.listId === one.id)
          .map((i) => i.id),
      )
      .toEqual([b.id, a.id]);
    await page.getByRole("button", { name: "Sort A", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  } finally {
    await request.delete(`/api/lists/${one.id}`);
    await request.delete(`/api/lists/${two.id}`);
  }
});
