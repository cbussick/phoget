import { and, asc, eq, getTableColumns, sql } from "drizzle-orm";
import { z } from "zod";
import { database } from "./database.js";
import type { User } from "../../shared/accounts.js";
import { items, lists, settings, itemNames, users } from "./schema.js";
import {
  itemSchema,
  itemHistorySchema,
  listSchema,
  listInputSchema,
  listUpdateSchema,
  settingsSchema,
  stateSchema,
} from "../../shared/contracts.js";

const databaseTimeSchema = z
  .string()
  .pipe(z.coerce.date())
  .transform((value) => value.toISOString());
const databaseListSchema = listSchema
  .extend({
    createdAt: databaseTimeSchema,
    updatedAt: databaseTimeSchema,
  })
  .strip(); // Internal foreign keys are not part of the public list response.
const databaseItemSchema = itemSchema.extend({ createdAt: databaseTimeSchema });
export class NotFoundError extends Error {}
export async function readState() {
  // A consistent snapshot avoids mismatched lists/items during concurrent deletion.
  return database.transaction(
    async (transaction) => {
      const storedLists = await transaction
        .select({ ...getTableColumns(lists), updatedBy: users.name })
        .from(lists)
        .leftJoin(users, eq(lists.updatedById, users.id))
        .orderBy(asc(lists.createdAt), asc(lists.id));
      const storedItems = await transaction
        .select()
        .from(items)
        .orderBy(asc(items.createdAt), asc(items.id));
      const [storedSettings] = await transaction.select().from(settings).where(eq(settings.id, 1));

      return stateSchema.parse({
        lists: z.array(databaseListSchema).parse(storedLists),
        items: z.array(databaseItemSchema).parse(storedItems),
        settings: settingsSchema.parse(storedSettings),
      });
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
type Actor = Pick<User, "id" | "name">;
export async function createList(input: z.infer<typeof listInputSchema>, actor: Actor) {
  const [row] = await database
    .insert(lists)
    .values({ ...input, updatedById: actor.id })
    .returning();
  return databaseListSchema.parse({ ...row, updatedBy: actor.name });
}
export async function updateList(
  id: string,
  input: z.infer<typeof listUpdateSchema>,
  actor: Actor,
) {
  const [row] = await database
    .update(lists)
    .set({ ...input, updatedAt: sql`clock_timestamp()`, updatedById: actor.id })
    .where(eq(lists.id, id))
    .returning();
  if (!row) throw new NotFoundError("Diese Liste existiert nicht mehr.");
  return databaseListSchema.parse({ ...row, updatedBy: actor.name });
}
export async function deleteList(id: string) {
  const rows = await database.delete(lists).where(eq(lists.id, id)).returning();
  if (!rows.length) throw new NotFoundError("Diese Liste existiert nicht mehr.");
  databaseListSchema.parse(rows[0]);
}
export async function createItem(
  listId: string,
  input: { name: string; note: string },
  actor: Actor,
) {
  return database.transaction(async (transaction) => {
    const [parent] = await transaction
      .update(lists)
      .set({ updatedAt: sql`clock_timestamp()`, updatedById: actor.id })
      .where(eq(lists.id, listId))
      .returning();
    if (!parent) throw new NotFoundError("Diese Liste existiert nicht mehr.");
    databaseListSchema.parse(parent);
    const [row] = await transaction
      .insert(items)
      .values({ ...input, listId })
      .returning();
    const parsed = databaseItemSchema.parse(row);
    await transaction
      .insert(itemNames)
      .values({ listId, key: parsed.name.toLowerCase(), name: parsed.name })
      .onConflictDoNothing();
    return parsed;
  });
}
export async function changeItem(
  id: string,
  input: { name?: string; note?: string; completed?: boolean } | null,
  actor: Actor,
) {
  return database.transaction(async (transaction) => {
    const [previous] = await transaction.select().from(items).where(eq(items.id, id)).for("update");
    if (!previous) throw new NotFoundError("Dieser Eintrag existiert nicht mehr.");
    const original = databaseItemSchema.parse(previous);
    const [row] =
      input === null
        ? await transaction.delete(items).where(eq(items.id, id)).returning()
        : await transaction.update(items).set(input).where(eq(items.id, id)).returning();
    if (!row) throw new NotFoundError("Dieser Eintrag existiert nicht mehr.");
    const parsed = databaseItemSchema.parse(row);
    for (const name of new Set([original.name, parsed.name])) {
      await transaction
        .insert(itemNames)
        .values({ listId: parsed.listId, key: name.toLowerCase(), name })
        .onConflictDoNothing();
    }
    if (input !== null && !original.completed && parsed.completed) {
      await transaction
        .update(itemNames)
        .set({ completionCount: sql`${itemNames.completionCount} + 1` })
        .where(
          and(eq(itemNames.listId, parsed.listId), eq(itemNames.key, parsed.name.toLowerCase())),
        );
    }
    await transaction
      .update(lists)
      .set({ updatedAt: sql`clock_timestamp()`, updatedById: actor.id })
      .where(eq(lists.id, parsed.listId));
    return parsed;
  });
}
export async function updateSettings(input: z.input<typeof settingsSchema>) {
  const [row] = await database
    .insert(settings)
    .values(input)
    .onConflictDoUpdate({ target: settings.id, set: input })
    .returning();
  return settingsSchema.parse(row);
}

export async function readItemHistory(listId: string) {
  return database.transaction(
    async (transaction) => {
      const [parent] = await transaction.select().from(lists).where(eq(lists.id, listId));
      if (!parent) throw new NotFoundError("Diese Liste existiert nicht mehr.");
      databaseListSchema.parse(parent);
      const names = await transaction
        .select({ name: itemNames.name, completionCount: itemNames.completionCount })
        .from(itemNames)
        .where(eq(itemNames.listId, listId));
      const current = await transaction
        .select({ name: items.name, completed: items.completed })
        .from(items)
        .where(eq(items.listId, listId));
      const history = z
        .array(
          z.object({
            name: z.string(),
            completionCount: z.number().int().nonnegative(),
          }),
        )
        .parse(names);
      const present = z
        .array(z.object({ name: z.string(), completed: z.boolean() }))
        .parse(current);
      const existingNames = new Set(
        present.filter((row) => !row.completed).map((row) => row.name.toLowerCase()),
      );
      return itemHistorySchema.parse({
        names: [
          ...new Map(
            [...history, ...present].map((row) => [row.name.toLowerCase(), row.name]),
          ).values(),
        ].sort((a, b) => a.localeCompare(b)),
        oftenBought: history
          .filter((row) => row.completionCount > 0 && !existingNames.has(row.name.toLowerCase()))
          .sort((a, b) => b.completionCount - a.completionCount || a.name.localeCompare(b.name))
          .slice(0, 3),
      });
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
