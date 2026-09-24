import assert from "node:assert/strict";
import { database, pool } from "../server/db/database.js";
import { users, sessions, loginAttempts, lists, settings } from "../server/db/schema.js";
import { hashPassword } from "../server/auth/passwords.js";
import { testCredentials } from "./testCredentials.js";
export async function prepareAccounts() {
  assert.equal(
    new URL(process.env.DATABASE_URL ?? "").pathname.slice(1),
    process.env.PHOGET_TEST_DATABASE,
  );
  assert.match(
    process.env.PHOGET_TEST_DATABASE ?? "",
    /^phoget_test_[a-f0-9]{12}(?:_(?:chromium|firefox|webkit))?$/,
  );
  const values = {
    name: "Test Admin",
    ...testCredentials,
    role: "admin" as const,
    mustChangePassword: false,
    passwordHash: await hashPassword(testCredentials.password),
  };
  const { password: _, ...stored } = values;
  await database.transaction(async (tx) => {
    await tx.delete(sessions);
    await tx.delete(loginAttempts);
    await tx.delete(lists); // Cascades to items and item-name history.
    await tx.delete(users);
    await tx.delete(settings);
    await tx.insert(settings).values({ id: 1, householdName: "Unser Haushalt" });
    await tx.insert(users).values(stored);
  });
}
if (process.argv[1]?.endsWith("prepareAccounts.ts")) {
  try {
    await prepareAccounts();
  } finally {
    await pool.end();
  }
}
