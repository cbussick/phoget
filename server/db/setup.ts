import { logger } from "../../shared/logging.js";
import { items, itemSuggestions, settings } from "./schema.js";
import { and, asc, eq, sql } from "drizzle-orm";
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
  await database.transaction(async (tx) => {
    const initialized = await tx
      .update(settings)
      .set({ suggestionsBackfilled: true })
      .where(and(eq(settings.id, 1), eq(settings.suggestionsBackfilled, false)))
      .returning({ id: settings.id });
    // Only seed once: later schema setups must not resurrect forgotten names.
    if (!initialized.length) {
      return;
    }
    const existing = await tx
      .select({ listId: items.listId, name: items.name })
      .from(items)
      .orderBy(asc(items.createdAt), asc(items.id));
    for (let start = 0; start < existing.length; start += 1000) {
      await tx
        .insert(itemSuggestions)
        .values(
          existing.slice(start, start + 1000).map((row) => ({
            ...row,
            nameKey: row.name.toLowerCase(),
          })),
        )
        .onConflictDoNothing();
    }
  });
  logger.log("Household initialized. Create the first administrator with npm run account:setup.");
} finally {
  await pool.end();
}
