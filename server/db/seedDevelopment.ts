import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { database, pool } from "./database.js";
import { users } from "./schema.js";
import { hashPassword } from "../auth/passwords.js";

// Deliberately bypass createUserSchema's five-character minimum for these two
// local-only fixtures. Account creation and password-change rules remain unchanged.
const name = `phoget_dev_${createHash("sha256").update(resolve(".")).digest("hex").slice(0, 12)}`;
const target = new URL(process.env.DATABASE_URL ?? "");
assert.ok(["localhost", "127.0.0.1"].includes(target.hostname), "Seed only loopback PostgreSQL");
assert.equal(process.env.PHOGET_DEV_DATABASE, name, "Use the current worktree runtime");
assert.equal(target.pathname, `/${name}`, "Seed only this worktree's development database");
assert.notEqual(process.env.NODE_ENV, "production", "Never seed in production mode");

try {
  for (const [username, role] of [
    ["admin", "admin"],
    ["user", "user"],
  ] as const) {
    const inserted = await database
      .insert(users)
      .values({
        username,
        name: username === "admin" ? "Demo Admin" : "Demo User",
        role,
        passwordHash: await hashPassword(username),
        mustChangePassword: false,
      })
      .onConflictDoNothing({ target: users.username })
      .returning({ username: users.username });
    console.log(
      `${username}/${username}: ${inserted.length ? "created" : "already exists (credentials unchanged)"}`,
    );
  }
} finally {
  await pool.end();
}
