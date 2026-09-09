import { ne, notInArray } from "drizzle-orm";
import assert from "node:assert/strict";
import { database, pool } from "../server/db/database.js";
import { users, loginAttempts, lists } from "../server/db/schema.js";
import { hashPassword } from "../server/auth/passwords.js";
import { testCredentials } from "./testCredentials.js";
export async function prepareAccounts() {
  assert.match(
    process.env.DATABASE_URL ?? "",
    /gather_test(?:\?|$)/,
    "Only prepare accounts in gather_test.",
  );
  const values = {
    name: "Test Admin",
    ...testCredentials,
    role: "admin" as const,
    mustChangePassword: false,
    passwordHash: await hashPassword(testCredentials.password),
  };
  const { password: _, ...stored } = values;
  await database
    .insert(users)
    .values(stored)
    .onConflictDoUpdate({ target: users.username, set: stored });
  await database.delete(users).where(ne(users.username, testCredentials.username));
  await database
    .delete(lists)
    .where(
      notInArray(lists.id, [
        "b4d6cd64-087f-5527-8551-2f47d3f753b7",
        "fdfcd72c-a785-5fde-9ce4-1fe70ac62bac",
        "835f6d22-1eab-59e3-a136-c083b74f6bab",
        "82763ebc-12b8-59f0-bf1b-2b60c12a812a",
        "b8e600a2-3e1c-5369-8912-18718ded3af4",
      ]),
    );
  await database.delete(loginAttempts);
}
if (process.argv[1]?.endsWith("prepareAccounts.ts")) {
  try {
    await prepareAccounts();
  } finally {
    await pool.end();
  }
}
