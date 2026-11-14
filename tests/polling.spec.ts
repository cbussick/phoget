import { expect } from "@playwright/test";
import { test } from "./browserTest";
import { listSchema } from "../shared/contracts";
import { testCredentials } from "./testCredentials";

test("idle list sync does not repeatedly fetch members or suggestion history", async ({
  page,
  request,
  context,
}) => {
  await request.post("/api/session", { data: testCredentials });
  await context.addCookies((await request.storageState()).cookies);
  const list = listSchema.parse(
    await (
      await request.post("/api/lists", { data: { name: "Polling " + crypto.randomUUID() } })
    ).json(),
  );
  const counts = new Map<string, number>();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/")) counts.set(path, (counts.get(path) ?? 0) + 1);
  });
  try {
    await page.clock.install();
    await page.goto(`/lists/${list.id}`);
    await expect(page.getByRole("heading", { name: list.name, exact: true })).toBeVisible();
    await expect.poll(() => counts.get(`/api/lists/${list.id}/history`)).toBe(1);
    expect(counts.get("/api/members") ?? 0).toBe(0);
    // E2E builds shorten all production polling intervals to one second.
    // Drive several cycles: list sync must continue, auxiliary queries must not.
    await page.clock.runFor(3_500);
    expect(counts.get("/api/state")).toBeGreaterThanOrEqual(2);
    expect(counts.get("/api/members") ?? 0).toBe(0);
    expect(counts.get(`/api/lists/${list.id}/history`)).toBe(1);

    await page.getByRole("link", { name: "Einstellungen" }).click();
    await page.getByRole("tab", { name: "Haushalt", exact: true }).click();
    await expect(page.getByRole("region", { name: "Haushaltsübersicht" })).toContainText(
      "1 Person",
    );
    await expect.poll(() => counts.get("/api/members")).toBe(1);
    await page.clock.runFor(3_500);
    expect(counts.get("/api/members")).toBe(1);
    await page.getByRole("tab", { name: "Benutzer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Benutzer im Haushalt" })).toBeVisible();
    await expect.poll(() => counts.get("/api/users")).toBe(1);
    await page.clock.runFor(3_500);
    expect(counts.get("/api/users")).toBe(1);
  } finally {
    await request.delete(`/api/lists/${list.id}`);
  }
});

test("the login page does not poll for a session", async ({ page }) => {
  let sessions = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/session") sessions++;
  });
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Willkommen zu Hause" })).toBeVisible();
  expect(sessions).toBe(1);
  await page.clock.runFor(3_500);
  expect(sessions).toBe(1);
});
