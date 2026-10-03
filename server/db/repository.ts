import { and, asc, eq, getTableColumns, sql } from "drizzle-orm";
import { HttpError } from "../httpErrors.js";
import { z } from "zod";
import { database } from "./database.js";
import type { User } from "../../shared/accounts.js";
import { items, itemPhotos, lists, settings, itemNames, users } from "./schema.js";
import {
  itemSchema,
  itemHistorySchema,
  forgetItemSchema,
  rememberedItemSchema,
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
const databaseItemSchema = itemSchema.extend({ createdAt: databaseTimeSchema }).strip();
export class NotFoundError extends Error {}
export async function readState() {
  // A consistent snapshot avoids mismatched lists/items during concurrent deletion.
  return database.transaction(
    async (transaction) => {
      const storedLists = await transaction
        .select({ ...getTableColumns(lists), updatedBy: users.name })
        .from(lists)
        .leftJoin(users, eq(lists.updatedById, users.id))
        .orderBy(asc(lists.position), asc(lists.createdAt), asc(lists.id));
      const storedItems = await transaction
        .select()
        .from(items)
        .orderBy(
          asc(items.listId),
          asc(items.completed),
          asc(items.position),
          asc(items.createdAt),
          asc(items.id),
        );
      const [storedSettings] = await transaction.select().from(settings).where(eq(settings.id, 1));
      const photoIds = new Set(
        (await transaction.select({ itemId: itemPhotos.itemId }).from(itemPhotos)).map(
          (row) => row.itemId,
        ),
      );

      return stateSchema.parse({
        lists: z.array(databaseListSchema).parse(storedLists),
        items: z
          .array(databaseItemSchema)
          .parse(storedItems.map((row) => ({ ...row, hasPhoto: photoIds.has(row.id) }))),
        settings: settingsSchema.parse(storedSettings),
      });
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
type Actor = Pick<User, "id" | "name">;

type OrderChange = { before: string[]; after: string[] };
function validateOrder(current: string[], change: OrderChange) {
  if (
    current.length !== change.before.length ||
    current.some((id, index) => id !== change.before[index])
  )
    throw new HttpError(409, "Die Reihenfolge wurde geändert. Bitte versuche es erneut.");
  if (
    new Set(change.after).size !== current.length ||
    change.after.length !== current.length ||
    change.after.some((id) => !current.includes(id))
  )
    throw new HttpError(400, "Ungültige Reihenfolge.");
}

export async function reorderLists(change: OrderChange) {
  await database.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1010)`);
    const current = await tx
      .select({ id: lists.id })
      .from(lists)
      .orderBy(asc(lists.position), asc(lists.createdAt), asc(lists.id));
    validateOrder(
      current.map((row) => row.id),
      change,
    );
    for (const [index, id] of change.after.entries())
      await tx
        .update(lists)
        .set({ position: index + 1 })
        .where(eq(lists.id, id));
  });
}

export async function reorderItems(listId: string, completed: boolean, change: OrderChange) {
  await database.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1011, hashtext(${listId}))`);
    const [parent] = await tx.select({ id: lists.id }).from(lists).where(eq(lists.id, listId));
    if (!parent) throw new NotFoundError("Diese Liste existiert nicht mehr.");
    const current = await tx
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.listId, listId), eq(items.completed, completed)))
      .orderBy(asc(items.position), asc(items.createdAt), asc(items.id));
    validateOrder(
      current.map((row) => row.id),
      change,
    );
    for (const [index, id] of change.after.entries())
      await tx
        .update(items)
        .set({ position: index + 1 })
        .where(eq(items.id, id));
  });
}
export async function createList(input: z.infer<typeof listInputSchema>, actor: Actor) {
  return database.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1010)`);
    const [row] = await tx
      .insert(lists)
      .values({
        ...input,
        updatedById: actor.id,
        position: sql`(SELECT coalesce(max(position), 0) + 1 FROM lists)`,
      })
      .returning();
    return databaseListSchema.parse({ ...row, updatedBy: actor.name });
  });
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
  await database.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1010)`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1011, hashtext(${id}))`);
    const rows = await tx.delete(lists).where(eq(lists.id, id)).returning();
    if (!rows.length) throw new NotFoundError("Diese Liste existiert nicht mehr.");
  });
}
export async function createItem(
  listId: string,
  input: { name: string; note: string },
  actor: Actor,
) {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(1011, hashtext(${listId}))`);
    const [parent] = await transaction.select().from(lists).where(eq(lists.id, listId));
    if (!parent) throw new NotFoundError("Diese Liste existiert nicht mehr.");
    // The list lock also serializes edits, toggles and reorders. Match with the
    // same JavaScript case folding as item history; prefer an open legacy copy.
    const candidates = await transaction
      .select()
      .from(items)
      .where(eq(items.listId, listId))
      .orderBy(asc(items.completed), asc(items.position), asc(items.createdAt), asc(items.id));
    const existing = candidates.find(
      (item) => item.name.toLowerCase() === input.name.toLowerCase(),
    );
    if (existing && !existing.completed) {
      const [photo] = await transaction
        .select()
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, existing.id));
      return {
        ...databaseItemSchema.parse(existing),
        hasPhoto: !!photo,
        outcome: "duplicate" as const,
      };
    }
    await transaction
      .update(lists)
      .set({ updatedAt: sql`clock_timestamp()`, updatedById: actor.id })
      .where(eq(lists.id, listId));
    if (existing) {
      const [restored] = await transaction
        .update(items)
        .set({
          completed: false,
          position: sql`(SELECT coalesce(max(position), 0) + 1 FROM items WHERE "listId" = ${listId} AND completed = false)`,
        })
        .where(eq(items.id, existing.id))
        .returning();
      const [photo] = await transaction
        .select()
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, existing.id));
      return {
        ...databaseItemSchema.parse(restored),
        hasPhoto: !!photo,
        outcome: "restored" as const,
      };
    }
    const [row] = await transaction
      .insert(items)
      .values({
        ...input,
        listId,
        position: sql`(SELECT coalesce(max(position), 0) + 1 FROM items WHERE "listId" = ${listId} AND completed = false)`,
      })
      .returning();
    const parsed = databaseItemSchema.parse(row);
    await transaction
      .insert(itemNames)
      .values({ listId, key: parsed.name.toLowerCase(), name: parsed.name })
      .onConflictDoNothing();
    return { ...parsed, outcome: "created" as const };
  });
}
export async function changeItem(
  id: string,
  input: { name?: string; note?: string; completed?: boolean } | null,
  actor: Actor,
) {
  return database.transaction(async (transaction) => {
    const [located] = await transaction
      .select({ listId: items.listId })
      .from(items)
      .where(eq(items.id, id));
    if (!located) throw new NotFoundError("Dieser Eintrag existiert nicht mehr.");
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(1011, hashtext(${located.listId}))`);
    const [previous] = await transaction.select().from(items).where(eq(items.id, id)).for("update");
    if (!previous) throw new NotFoundError("Dieser Eintrag existiert nicht mehr.");
    const original = databaseItemSchema.parse(previous);
    const [row] =
      input === null
        ? await transaction.delete(items).where(eq(items.id, id)).returning()
        : await transaction
            .update(items)
            .set({
              ...input,
              ...(input.completed !== undefined && input.completed !== previous.completed
                ? {
                    position: sql`(SELECT coalesce(max(position), 0) + 1 FROM items WHERE "listId" = ${previous.listId} AND completed = ${input.completed})`,
                  }
                : {}),
            })
            .where(eq(items.id, id))
            .returning();
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

// Share the list lock with add/edit/complete so a stale suggestion cannot delete an active item.
export async function forgetItem(
  listId: string,
  input: z.infer<typeof forgetItemSchema>,
  actor: Actor,
) {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(1011, hashtext(${listId}))`);
    const [parent] = await transaction.select().from(lists).where(eq(lists.id, listId));
    if (!parent) throw new NotFoundError("Diese Liste existiert nicht mehr.");
    const key = input.name.toLowerCase();
    const matching = await transaction
      .select()
      .from(items)
      .where(and(eq(items.listId, listId), sql`lower(${items.name}) = ${key}`));
    if (matching.some((item) => !item.completed))
      throw new HttpError(409, "Dieser Eintrag steht inzwischen auf der offenen Liste.");
    const actualIds = matching.map((item) => item.id).sort();
    if (JSON.stringify(actualIds) !== JSON.stringify([...input.completedIds].sort()))
      throw new HttpError(
        409,
        "Die erledigten Einträge haben sich geändert. Bitte prüfe den Vorschlag erneut.",
      );
    if (matching.length) {
      await transaction
        .delete(items)
        .where(
          and(
            eq(items.listId, listId),
            sql`lower(${items.name}) = ${key}`,
            eq(items.completed, true),
          ),
        );
    }
    const [remembered] = await transaction
      .delete(itemNames)
      .where(and(eq(itemNames.listId, listId), eq(itemNames.key, key)))
      .returning({ name: itemNames.name, completionCount: itemNames.completionCount });
    if (matching.length) {
      await transaction
        .update(lists)
        .set({ updatedAt: sql`clock_timestamp()`, updatedById: actor.id })
        .where(eq(lists.id, listId));
    }
    return { remembered: remembered ?? null, removedCompleted: matching.length > 0 };
  });
}

// Undo is only offered for history-only removal. Never overwrite newly learned history.
export async function restoreRememberedItem(
  listId: string,
  input: z.infer<typeof rememberedItemSchema>,
) {
  await database.transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(1011, hashtext(${listId}))`);
    const [parent] = await transaction.select().from(lists).where(eq(lists.id, listId));
    if (!parent) throw new NotFoundError("Diese Liste existiert nicht mehr.");
    await transaction
      .insert(itemNames)
      .values({ ...input, listId, key: input.name.toLowerCase() })
      .onConflictDoNothing();
  });
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
        ]
          .filter((name) => !existingNames.has(name.toLowerCase()))
          .sort((a, b) => a.localeCompare(b)),
        oftenBought: history
          .filter((row) => row.completionCount > 0 && !existingNames.has(row.name.toLowerCase()))
          .sort((a, b) => b.completionCount - a.completionCount || a.name.localeCompare(b.name))
          .slice(0, 3),
      });
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
