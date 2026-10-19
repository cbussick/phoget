import { eq, sql } from "drizzle-orm";
import type { Transaction } from "./database.js";
import { lists } from "./schema.js";

export async function markListUpdated(transaction: Transaction, listId: string, actorId: string) {
  await transaction
    .update(lists)
    .set({ updatedAt: sql`clock_timestamp()`, updatedById: actorId })
    .where(eq(lists.id, listId));
}
