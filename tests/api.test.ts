import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { app } from "../server/app.js";
import { pool } from "../server/db/database.js";
import { stateSchema, listSchema, itemSchema, settingsSchema } from "../shared/contracts.js";

let server: Server;
let base: string;
const created: string[] = [];
before(async () => {
  assert.match(
    process.env.DATABASE_URL ?? "",
    /gather_test(?:\?|$)/,
    "Use the isolated gather_test database.",
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  base = "http://127.0.0.1:" + address.port;
});
after(async () => {
  for (const id of created) await fetch(base + "/api/lists/" + id, { method: "DELETE" });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});
function send(path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) {
  return fetch(base + "/api" + path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function create(name = "API test") {
  const response = await send("/lists", "POST", { name });
  assert.equal(response.status, 201);
  const list = listSchema.parse(await response.json());
  created.push(list.id);
  return list;
}
test("lists and items persist, edit, complete, restore, and cascade delete", async () => {
  const list = await create("  Shared errands  ");
  assert.equal(list.name, "Shared errands");
  const added = await send("/lists/" + list.id + "/items", "POST", {
    name: "  Tomatoes ",
    note: "Sweet ones",
  });
  assert.equal(added.status, 201);
  const item = itemSchema.parse(await added.json());
  assert.equal(item.name, "Tomatoes");
  const edited = await send("/items/" + item.id, "PATCH", {
    name: "Two packs",
    note: "",
    completed: true,
  });
  const saved = itemSchema.parse(await edited.json());
  assert.equal(saved.completed, true);
  assert.equal(saved.note, "");
  let state = stateSchema.parse(await (await send("/state")).json());
  assert.equal(state.items.find((row) => row.id === item.id)?.name, "Two packs");
  await send("/items/" + item.id, "PATCH", { completed: false });
  await send("/lists/" + list.id, "PUT", {
    name: "Renamed",
    description: "Together",
    icon: "heart",
  });
  state = stateSchema.parse(await (await send("/state")).json());
  assert.equal(state.items.find((row) => row.id === item.id)?.completed, false);
  assert.equal(state.lists.find((row) => row.id === list.id)?.icon, "heart");
  assert.equal((await send("/lists/" + list.id, "DELETE")).status, 204);
  state = stateSchema.parse(await (await send("/state")).json());
  assert.ok(!state.items.some((row) => row.listId === list.id));
  assert.equal((await send("/items/" + item.id, "PATCH", { completed: true })).status, 404);
});
test("rejects malformed, unknown, oversized and hostile input without leaking details", async () => {
  for (const body of [
    { name: "   " },
    { name: "x".repeat(201) },
    { name: "Test", owner: "someone" },
    {},
  ]) {
    assert.equal((await send("/lists", "POST", body)).status, 400);
  }
  assert.equal((await send("/lists/not-a-uuid", "DELETE")).status, 400);
  assert.equal(
    (await send("/lists/00000000-0000-4000-8000-000000000001/items", "POST", { name: "x" })).status,
    404,
  );
  assert.equal((await send("/lists", "POST", { name: "x".repeat(20000) })).status, 413);
  assert.equal(
    (await send("/lists", "POST", { name: "x" }, { Origin: "https://attacker.invalid" })).status,
    403,
  );
  assert.equal(
    (await send("/lists", "POST", { name: "x" }, { "Sec-Fetch-Site": "cross-site" })).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/lists", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "x",
      })
    ).status,
    415,
  );
  const malformed = await fetch(base + "/api/lists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{bad",
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: "Invalid JSON." });
  assert.equal((await send("/missing")).status, 404);
});
test("parallel independent edits preserve both people’s changes", async () => {
  const list = await create();
  const response = await send("/lists/" + list.id + "/items", "POST", {
    name: "Original",
    note: "Original note",
  });
  const item = itemSchema.parse(await response.json());
  const results = await Promise.all([
    send("/items/" + item.id, "PATCH", { name: "New name" }),
    send("/items/" + item.id, "PATCH", { completed: true }),
  ]);
  results.forEach((result) => assert.equal(result.status, 200));
  const state = stateSchema.parse(await (await send("/state")).json());
  const stored = state.items.find((row) => row.id === item.id);
  assert.equal(stored?.name, "New name");
  assert.equal(stored?.completed, true);
  assert.equal((await send("/items/" + item.id, "PATCH", { completed: "yes" })).status, 400);
  assert.equal((await send("/items/" + item.id, "PATCH", {})).status, 400);
  assert.equal((await send("/items/" + item.id, "DELETE")).status, 204);
});
test("settings persist and validate, with security headers on responses", async () => {
  const stateResponse = await send("/state");
  assert.equal(stateResponse.headers.get("cache-control"), "no-store");
  assert.ok(stateResponse.headers.get("content-security-policy"));
  assert.equal(stateResponse.headers.get("x-powered-by"), null);
  const state = stateSchema.parse(await stateResponse.json());
  const { id: _, ...original } = state.settings;
  try {
    const saved = await send("/settings", "PUT", {
      ...original,
      householdName: "Test household",
      suggestions: ["Tea"],
    });
    assert.equal(settingsSchema.parse(await saved.json()).householdName, "Test household");
    assert.equal(
      (await send("/settings", "PUT", { ...original, suggestions: Array(11).fill("x") })).status,
      400,
    );
  } finally {
    await send("/settings", "PUT", original);
  }
});
