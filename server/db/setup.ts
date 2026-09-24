import { settings } from "./schema.js";
import { sql } from "drizzle-orm";
import { database, pool } from "./database.js";
try {
  // Backfill pre-ordering rows once, preserving their previous creation-time order.
  await database.execute(sql`WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS ordinal FROM lists
  ) UPDATE lists SET position = ranked.ordinal FROM ranked
  WHERE lists.id = ranked.id AND lists.position = 0`);
  await database.execute(sql`WITH ranked AS (
    SELECT id, row_number() OVER (PARTITION BY "listId", completed ORDER BY "createdAt", id) AS ordinal FROM items
  ) UPDATE items SET position = ranked.ordinal FROM ranked
  WHERE items.id = ranked.id AND items.position = 0`);
  await database
    .insert(settings)
    .values({
      id: 1,
      householdName: "Unser Haushalt",
    })
    .onConflictDoNothing();
  console.log("Household initialized. Create the first administrator with npm run account:setup.");
} finally {
  await pool.end();
}
