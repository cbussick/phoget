import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { app } from "../server/app.js";
import { pool } from "../server/db/database.js";
import {
  stateSchema,
  listSchema,
  itemSchema,
  settingsSchema,
  itemHistorySchema,
} from "../shared/contracts.js";

import { prepareAccounts } from "./prepareAccounts.js";
import { testCredentials } from "./testCredentials.js";
import { userSchema, sessionSchema, usersSchema } from "../shared/accounts.js";

let cookie = "";
let adminId = "";
let server: Server;
let base: string;
const created: string[] = [];
before(async () => {
  assert.match(
    process.env.DATABASE_URL ?? "",
    /gather_test(?:\?|$)/,
    "Use the isolated gather_test database.",
  );
  await prepareAccounts();
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  base = "http://127.0.0.1:" + address.port;
  const response = await send("/session", "POST", testCredentials);
  assert.equal(response.status, 200);
  cookie = response.headers.get("set-cookie")!.split(";")[0];
  adminId = sessionSchema.parse(await response.json()).user!.id;
});
after(async () => {
  for (const id of created) await send("/lists/" + id, "DELETE");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});
function send(path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) {
  return fetch(base + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Gather-Request": "1",
      Cookie: path === "/session" && method === "POST" ? "" : cookie,
      ...headers,
    },
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
test("list activity is server-owned and covers every list/item mutation", async () => {
  const list = await create("Activity");
  assert.equal(list.updatedBy, "Test Admin");
  const item = itemSchema.parse(
    await (await send(`/lists/${list.id}/items`, "POST", { name: "Activity item" })).json(),
  );
  const readList = async () =>
    stateSchema
      .parse(await (await send("/state")).json())
      .lists.find((entry) => entry.id === list.id)!;
  for (const mutate of [
    () => send(`/lists/${list.id}`, "PUT", { name: "Renamed activity" }),
    () => send(`/lists/${list.id}/items`, "POST", { name: "Another item" }),
    () => send(`/items/${item.id}`, "PATCH", { name: "Edited item", note: "A note" }),
    () => send(`/items/${item.id}`, "PATCH", { completed: true }),
    () => send(`/items/${item.id}`, "PATCH", { completed: false }),
    () => send(`/items/${item.id}`, "DELETE"),
  ]) {
    // Model a legacy row with no recorded author before each mutation.
    await pool.query('UPDATE lists SET "updatedById" = NULL, "updatedAt" = $1 WHERE id = $2', [
      "2020-01-01T00:00:00Z",
      list.id,
    ]);
    assert.equal((await readList()).updatedBy, null);
    assert.ok((await mutate()).ok);
    const changed = await readList();
    assert.equal(changed.updatedBy, "Test Admin");
    assert.ok(Date.parse(changed.updatedAt) > Date.parse("2020-01-01T00:00:00Z"));
  }
  const before = await readList();
  assert.equal(
    (await send(`/lists/${list.id}`, "PUT", { name: "Forged", updatedBy: "Someone else" })).status,
    400,
  );
  assert.equal(
    (await send(`/lists/${list.id}`, "PUT", { name: "Forged", updatedById: adminId })).status,
    400,
  );
  assert.deepEqual(await readList(), before);
});

test("list colors persist, validate, and survive updates from clients omitting color", async () => {
  const legacy = await create("Default color");
  assert.equal(legacy.color, "#8bcdf1");
  const response = await send("/lists", "POST", { name: "Colored", color: "#ABCDEF" });
  assert.equal(response.status, 201);
  const list = listSchema.parse(await response.json());
  created.push(list.id);
  assert.equal(list.color, "#abcdef");
  const update = await send("/lists/" + list.id, "PUT", {
    name: "Colored",
    icon: "heart",
    color: "#243566",
  });
  assert.equal(listSchema.parse(await update.json()).color, "#243566");
  await send("/lists/" + list.id, "PUT", { name: "Renamed", icon: "home" });
  for (const color of [
    "red",
    "#abc",
    "#12345678",
    "#123456\n",
    "url(https://example.com)",
    "",
    null,
    42,
  ]) {
    for (const [path, method] of [
      ["/lists", "POST"],
      ["/lists/" + list.id, "PUT"],
    ]) {
      const failure = await send(path, method, { name: "Invalid", color });
      assert.equal(failure.status, 400, String(color));
      assert.equal((await failure.json()).field, "color");
    }
  }
  const state = stateSchema.parse(await (await send("/state")).json());
  assert.equal(state.lists.find((row) => row.id === list.id)?.color, "#243566");
  const persisted = await pool.query("select color from lists where id = $1", [list.id]);
  assert.equal(persisted.rows[0].color, "#243566");
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
        headers: { "Content-Type": "text/plain", "X-Gather-Request": "1", Cookie: cookie },
        body: "x",
      })
    ).status,
    415,
  );
  const malformed = await fetch(base + "/api/lists", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Gather-Request": "1", Cookie: cookie },
    body: "{bad",
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: "Ungültiges JSON." });
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
    });
    assert.equal(settingsSchema.parse(await saved.json()).householdName, "Test household");
    assert.equal((await send("/settings", "PUT", { ...original, householdName: " " })).status, 400);
  } finally {
    await send("/settings", "PUT", original);
  }
});

test("authentication protects data and mutations require the same-origin header", async () => {
  for (const path of ["/state", "/users", "/members"])
    assert.equal((await send(path, "GET", undefined, { Cookie: "" })).status, 401);
  assert.equal(
    (await send("/session", "POST", { ...testCredentials, password: "wrong" }, { Cookie: "" }))
      .status,
    401,
  );
  assert.equal(
    (await send("/lists", "POST", { name: "Blocked" }, { "X-Gather-Request": "" })).status,
    403,
  );
  const login = await send("/session", "POST", testCredentials, { Cookie: "" });
  assert.match(login.headers.get("set-cookie")!, /HttpOnly/);
  assert.match(login.headers.get("set-cookie")!, /SameSite=Strict/);
  const secondCookie = login.headers.get("set-cookie")!.split(";")[0];
  assert.notEqual(secondCookie, cookie);
  assert.equal((await send("/session", "DELETE", undefined, { Cookie: secondCookie })).status, 204);
  assert.equal((await send("/state", "GET", undefined, { Cookie: secondCookie })).status, 401);
});

test("user lifecycle enforces roles, temporary passwords and session revocation", async () => {
  const username = "user-" + crypto.randomUUID().slice(0, 8);
  const input = { username, name: "Jamie", role: "user", password: "temporary household password" };
  const createdResponse = await send("/users", "POST", input);
  assert.equal(createdResponse.status, 201);
  const user = userSchema.parse(await createdResponse.json());
  try {
    assert.equal((await send("/users", "POST", input)).status, 409);
    const login = await send("/session", "POST", { username, password: input.password });
    const temporaryCookie = login.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await send("/state", "GET", undefined, { Cookie: temporaryCookie })).status, 403);
    const password = "my own household password";
    const changed = await send(
      "/account/password",
      "PUT",
      { currentPassword: input.password, password },
      { Cookie: temporaryCookie },
    );
    assert.equal(changed.status, 200);
    const userCookie = changed.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await send("/state", "GET", undefined, { Cookie: temporaryCookie })).status, 401);
    assert.equal((await send("/state", "GET", undefined, { Cookie: userCookie })).status, 200);
    for (const [path, method, body] of [
      ["/users", "GET", undefined],
      ["/users", "POST", input],
      ["/users/" + adminId, "DELETE", undefined],
      ["/users/" + adminId + "/password", "PUT", { password }],
      ["/settings", "PUT", { householdName: "Stolen" }],
    ] as const) {
      assert.equal((await send(path, method, body, { Cookie: userCookie })).status, 403);
    }
    assert.equal(
      (
        await send(
          "/account",
          "PATCH",
          { name: "Jamie New", role: "admin" },
          { Cookie: userCookie },
        )
      ).status,
      400,
    );
    assert.equal(
      (await send("/account", "PATCH", { name: "Jamie New" }, { Cookie: userCookie })).status,
      200,
    );
    const sharedList = await send(
      "/lists",
      "POST",
      { name: "A user's shared list" },
      { Cookie: userCookie },
    );
    assert.equal(sharedList.status, 201);
    const list = listSchema.parse(await sharedList.json());
    created.push(list.id);
    assert.equal(list.updatedBy, "Jamie New");
    const listed = await (await send("/users")).json();
    assert.ok(!JSON.stringify(listed).includes("passwordHash"));
    assert.ok(!JSON.stringify(listed).includes(input.password));
    assert.equal(
      (await send("/users/" + user.id, "PUT", { name: "Jamie Admin", username, role: "admin" }))
        .status,
      200,
    );
    assert.equal((await send("/state", "GET", undefined, { Cookie: userCookie })).status, 401);
    assert.equal(
      stateSchema
        .parse(await (await send("/state")).json())
        .lists.find((entry) => entry.id === list.id)?.updatedBy,
      "Jamie Admin",
    );
    const promotedLogin = await send("/session", "POST", { username, password });
    const promotedCookie = promotedLogin.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await send("/users", "GET", undefined, { Cookie: promotedCookie })).status, 200);
    assert.equal(
      (
        await send("/users/" + user.id + "/password", "PUT", {
          password: "another temporary password",
        })
      ).status,
      200,
    );
    assert.equal((await send("/state", "GET", undefined, { Cookie: promotedCookie })).status, 401);
    assert.equal((await send("/session", "POST", { username, password })).status, 401);
    const resetLogin = await send("/session", "POST", {
      username,
      password: "another temporary password",
    });
    assert.equal(sessionSchema.parse(await resetLogin.json()).user?.mustChangePassword, true);
    const resetCookie = resetLogin.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await send("/users/" + user.id, "DELETE")).status, 204);
    assert.equal(
      stateSchema
        .parse(await (await send("/state")).json())
        .lists.find((entry) => entry.id === list.id)?.updatedBy,
      null,
    );
    assert.equal(
      (
        await send(
          "/account/password",
          "PUT",
          { currentPassword: "another temporary password", password },
          { Cookie: resetCookie },
        )
      ).status,
      401,
    );
    assert.ok(
      stateSchema
        .parse(await (await send("/state")).json())
        .lists.some((row) => row.id === list.id),
    );
  } finally {
    await send("/users/" + user.id, "DELETE");
  }
});

test("the final administrator cannot be deleted or demoted", async () => {
  const all = usersSchema.parse(await (await send("/users")).json());
  assert.equal(all.filter((user) => user.role === "admin").length, 1);
  assert.equal((await send("/users/" + adminId, "DELETE")).status, 409);
  assert.equal(
    (
      await send("/users/" + adminId, "PUT", {
        username: testCredentials.username,
        name: "Admin",
        role: "user",
      })
    ).status,
    409,
  );
});

test("expired sessions are rejected and login attempts are rate limited", async () => {
  const { database } = await import("../server/db/database.js");
  const { sessions, loginAttempts } = await import("../server/db/schema.js");
  const { eq } = await import("drizzle-orm");
  const { tokenDigest } = await import("../server/auth/accounts.js");
  const login = await send("/session", "POST", testCredentials);
  const expiredCookie = login.headers.get("set-cookie")!.split(";")[0];
  await database
    .update(sessions)
    .set({ expiresAt: new Date(0) })
    .where(eq(sessions.tokenHash, tokenDigest(expiredCookie.split("=")[1])));
  assert.equal((await send("/state", "GET", undefined, { Cookie: expiredCookie })).status, 401);
  const username = "rate-limit-test";
  await database
    .insert(loginAttempts)
    .values({ key: tokenDigest(username), count: 30, expiresAt: new Date(Date.now() + 60000) });
  try {
    assert.equal(
      (await send("/session", "POST", { username, password: "incorrect password" })).status,
      429,
    );
  } finally {
    await database.delete(loginAttempts).where(eq(loginAttempts.key, tokenDigest(username)));
  }
});

test("concurrent admin demotions preserve an administrator and bootstrap cannot reopen", async () => {
  const { createAccount, editAccount, readUsers } = await import("../server/auth/accounts.js");
  const { database } = await import("../server/db/database.js");
  const { users } = await import("../server/db/schema.js");
  const { eq } = await import("drizzle-orm");
  await assert.rejects(
    () =>
      createAccount({
        name: "Intruder",
        username: "intruder",
        role: "admin",
        password: "unwanted admin password",
      }),
    /existiert bereits/,
  );
  const second = await createAccount(
    {
      name: "Second Admin",
      username: "race-admin",
      role: "admin",
      password: "second admin test password",
    },
    adminId,
  );
  await database.update(users).set({ mustChangePassword: false }).where(eq(users.id, second.id));
  try {
    const results = await Promise.allSettled([
      editAccount(adminId, adminId, {
        name: "Test Admin",
        username: testCredentials.username,
        role: "user",
      }),
      editAccount(second.id, second.id, {
        name: second.name,
        username: second.username,
        role: "user",
      }),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal((await readUsers()).filter((user) => user.role === "admin").length, 1);
  } finally {
    await database.update(users).set({ role: "admin" }).where(eq(users.id, adminId));
    await database.delete(users).where(eq(users.id, second.id));
    const login = await send("/session", "POST", testCredentials);
    cookie = login.headers.get("set-cookie")!.split(";")[0];
  }
});

test("administrators cannot delete or reset themselves even with another administrator", async () => {
  const response = await send("/users", "POST", {
    name: "Another administrator",
    username: "self-guard-admin",
    role: "admin",
    password: "another administrator password",
  });
  assert.equal(response.status, 201);
  const second = userSchema.parse(await response.json());
  try {
    const deletion = await send("/users/" + adminId, "DELETE");
    assert.equal(deletion.status, 409);
    assert.match((await deletion.json()).error, /eigenes Konto nicht löschen/);
    const reset = await send("/users/" + adminId + "/password", "PUT", {
      password: "unwanted replacement password",
    });
    assert.equal(reset.status, 409);
    assert.match((await reset.json()).error, /Ändere es unter Mein Konto/);
    assert.equal(
      (await send("/users")).status,
      200,
      "blocked operations preserve the administrator session",
    );
    const session = sessionSchema.parse(await (await send("/session")).json());
    assert.equal(session.user?.mustChangePassword, false);
    const login = await send("/session", "POST", testCredentials);
    assert.equal(login.status, 200, "the original password still works");
  } finally {
    assert.equal((await send("/users/" + second.id, "DELETE")).status, 204);
  }
});

test("item history is per-list and preserves completed, renamed and removed names", async () => {
  const first = await create("History");
  const second = await create("Other history");
  const response = await send("/lists/" + first.id + "/items", "POST", { name: "Coffee" });
  const item = itemSchema.parse(await response.json());
  await send("/items/" + item.id, "PATCH", { completed: true });
  await send("/items/" + item.id, "PATCH", { name: "Decaf coffee" });
  await send("/items/" + item.id, "DELETE");
  await send("/lists/" + first.id + "/items", "POST", { name: "coffee" });
  const { names } = itemHistorySchema.parse(
    await (await send("/lists/" + first.id + "/history")).json(),
  );
  assert.equal(names.filter((name: string) => name.toLowerCase() === "coffee").length, 1);
  assert.ok(names.includes("Decaf coffee"));
  assert.deepEqual(await (await send("/lists/" + second.id + "/history")).json(), {
    names: [],
    oftenBought: [],
  });
  assert.equal(
    (await send("/lists/" + first.id + "/history", "GET", undefined, { Cookie: "" })).status,
    401,
  );
  await send("/lists/" + first.id, "DELETE");
  assert.equal((await send("/lists/" + first.id + "/history")).status, 404);
});

test("Often Bought ranks completed names per list, excludes unfinished names and counts transitions once", async () => {
  const list = await create("Frequent purchases");
  const other = await create("Unrelated purchases");
  const history = async () =>
    itemHistorySchema.parse(await (await send("/lists/" + list.id + "/history")).json());
  const add = async (name: string) =>
    itemSchema.parse(await (await send("/lists/" + list.id + "/items", "POST", { name })).json());
  for (const [name, count] of [
    ["Coffee", 4],
    ["Apples", 3],
    ["Tea", 2],
    ["Bread", 1],
  ] as const) {
    const item = await add(name);
    for (let index = 0; index < count; index++) {
      await send("/items/" + item.id, "PATCH", { completed: false });
      const repeated = await Promise.all([
        send("/items/" + item.id, "PATCH", { completed: true }),
        send("/items/" + item.id, "PATCH", { completed: true }),
      ]);
      assert.deepEqual(
        repeated.map((response) => response.status),
        [200, 200],
      );
    }
    if (name === "Coffee")
      assert.ok(
        (await history()).oftenBought.some((entry) => entry.name === name),
        "done items remain eligible",
      );
    await send("/items/" + item.id, "DELETE");
  }
  assert.deepEqual((await history()).oftenBought, [
    { name: "Coffee", completionCount: 4 },
    { name: "Apples", completionCount: 3 },
    { name: "Tea", completionCount: 2 },
  ]);
  const coffee = await add("COFFEE");
  assert.deepEqual(
    (await history()).oftenBought.map((entry) => entry.name),
    ["Apples", "Tea", "Bread"],
  );
  await send("/items/" + coffee.id, "PATCH", { completed: true });
  assert.deepEqual((await history()).oftenBought[0], { name: "Coffee", completionCount: 5 });
  const unfinishedCoffee = await add("coffee");
  assert.ok(
    !(await history()).oftenBought.some((entry) => entry.name === "Coffee"),
    "an unfinished copy excludes a name even when a done copy exists",
  );
  await send("/items/" + unfinishedCoffee.id, "DELETE");
  await send("/items/" + coffee.id, "PATCH", { name: "Decaf" });
  assert.deepEqual((await history()).oftenBought[0], { name: "Coffee", completionCount: 5 });
  await send("/items/" + coffee.id, "DELETE");
  assert.ok(
    !(await history()).oftenBought.some((entry) => entry.name === "Decaf"),
    "renaming does not invent completions for the new name",
  );
  assert.deepEqual(
    itemHistorySchema.parse(await (await send("/lists/" + other.id + "/history")).json())
      .oftenBought,
    [],
  );
});
