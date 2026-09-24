import { expect } from "@playwright/test";
import { test } from "./browserTest";
import { testCredentials } from "./testCredentials";

let oldCookie: string;

test("a test can leave database changes behind", async ({ request }) => {
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  oldCookie = (await request.storageState()).cookies.find(
    (cookie) => cookie.name === "phoget-session",
  )!.value;
  expect((await request.post("/api/lists", { data: { name: "Isolation marker" } })).status()).toBe(
    201,
  );
  expect(
    (await request.put("/api/settings", { data: { householdName: "Changed household" } })).status(),
  ).toBe(200);
});

test("the next test starts with baseline data and no prior session", async ({ request }) => {
  expect((await request.post("/api/session", { data: testCredentials })).status()).toBe(200);
  const state = await (await request.get("/api/state")).json();
  expect(state.settings.householdName).toBe("Unser Haushalt");
  expect(state.lists).toEqual([]);
  const previousSession = await request.get("/api/session", {
    headers: { Cookie: `phoget-session=${oldCookie}` },
  });
  expect((await previousSession.json()).user).toBeNull();
});
