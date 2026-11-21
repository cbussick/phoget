import { and, asc, eq, getTableColumns, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { HttpError } from "../httpErrors.js";
import { z } from "zod";
import { database } from "./database.js";
import type { Transaction } from "./database.js";
import { markListUpdated } from "./listActivity.js";
import type { User } from "../../shared/accounts.js";
import { items, itemPhotos, lists, settings, users } from "./schema.js";
import type { listInputSchema, listUpdateSchema } from "../../shared/contracts.js";
import { itemSchema, listSchema, settingsSchema, stateSchema } from "../../shared/contracts.js";

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

async function requireList(transaction: Transaction, listId: string) {
  const [parent] = await transaction
    .select({ id: lists.id })
    .from(lists)
    .where(eq(lists.id, listId));
  if (!parent) {
    throw new NotFoundError("Diese Liste existiert nicht mehr.");
  }
}
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

type OrderChange = { before: Array<string>; after: Array<string> };
function validateOrder(current: Array<string>, change: OrderChange) {
  if (
    current.length !== change.before.length ||
    current.some((id, index) => id !== change.before[index])
  ) {
    throw new HttpError(409, "Die Reihenfolge wurde geändert. Bitte versuche es erneut.");
  }
  const currentIds = new Set(current);
  if (
    new Set(change.after).size !== current.length ||
    change.after.length !== current.length ||
    change.after.some((id) => !currentIds.has(id))
  ) {
    throw new HttpError(400, "Ungültige Reihenfolge.");
  }
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
    for (const [index, id] of change.after.entries()) {
      await tx
        .update(lists)
        .set({ position: index + 1 })
        .where(eq(lists.id, id));
    }
  });
}

export async function reorderItems(listId: string, completed: boolean, change: OrderChange) {
  await database.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1011, hashtext(${listId}))`);
    await requireList(tx, listId);
    const current = await tx
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.listId, listId), eq(items.completed, completed)))
      .orderBy(asc(items.position), asc(items.createdAt), asc(items.id));
    validateOrder(
      current.map((row) => row.id),
      change,
    );
    for (const [index, id] of change.after.entries()) {
      await tx
        .update(items)
        .set({ position: index + 1 })
        .where(eq(items.id, id));
    }
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
  if (!row) {
    throw new NotFoundError("Diese Liste existiert nicht mehr.");
  }
  return databaseListSchema.parse({ ...row, updatedBy: actor.name });
}
export async function deleteList(id: string) {
  await database.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1010)`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1011, hashtext(${id}))`);
    const rows = await tx.delete(lists).where(eq(lists.id, id)).returning();
    if (!rows.length) {
      throw new NotFoundError("Diese Liste existiert nicht mehr.");
    }
  });
}
export async function createItem(
  listId: string,
  input: { name: string; note: string },
  actor: Actor,
) {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(1011, hashtext(${listId}))`);
    await requireList(transaction, listId);
    // The list lock also serializes edits, toggles and reorders. Match with the
    // case-insensitive name; prefer an open copy if legacy duplicates exist.
    const candidates = await transaction
      .select()
      .from(items)
      .where(eq(items.listId, listId))
      .orderBy(asc(items.completed), asc(items.position), asc(items.createdAt), asc(items.id));
    const existing = candidates.find(
      (item) => item.name.toLowerCase() === input.name.toLowerCase(),
    );
    if (existing) {
      let row = existing;
      if (existing.completed) {
        await markListUpdated(transaction, listId, actor.id);
        [row] = await transaction
          .update(items)
          .set({
            completed: false,
            position: sql`(SELECT coalesce(max(position), 0) + 1 FROM items WHERE "listId" = ${listId} AND completed = false)`,
          })
          .where(eq(items.id, existing.id))
          .returning();
      }
      const [photo] = await transaction
        .select({ itemId: itemPhotos.itemId })
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, existing.id));
      return {
        ...databaseItemSchema.parse(row),
        hasPhoto: !!photo,
        outcome: existing.completed ? ("restored" as const) : ("duplicate" as const),
      };
    }
    await markListUpdated(transaction, listId, actor.id);
    const [row] = await transaction
      .insert(items)
      .values({
        ...input,
        listId,
        position: sql`(SELECT coalesce(max(position), 0) + 1 FROM items WHERE "listId" = ${listId} AND completed = false)`,
      })
      .returning();
    return { ...databaseItemSchema.parse(row), outcome: "created" as const };
  });
}
type ItemChanges = { name?: string; note?: string; completed?: boolean };
type PositionedItemChanges = ItemChanges & { position?: SQL };

export async function changeItem(id: string, input: ItemChanges | null, actor: Actor) {
  return database.transaction(async (transaction) => {
    const [located] = await transaction
      .select({ listId: items.listId })
      .from(items)
      .where(eq(items.id, id));
    if (!located) {
      throw new NotFoundError("Dieser Eintrag existiert nicht mehr.");
    }
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(1011, hashtext(${located.listId}))`);
    const [previous] = await transaction.select().from(items).where(eq(items.id, id)).for("update");
    if (!previous) {
      throw new NotFoundError("Dieser Eintrag existiert nicht mehr.");
    }
    const changes: PositionedItemChanges = { ...input };
    if (input?.completed !== undefined && input.completed !== previous.completed) {
      changes.position = sql`(SELECT coalesce(max(position), 0) + 1 FROM items WHERE "listId" = ${previous.listId} AND completed = ${input.completed})`;
    }
    const [row] =
      input === null
        ? await transaction.delete(items).where(eq(items.id, id)).returning()
        : await transaction.update(items).set(changes).where(eq(items.id, id)).returning();
    if (!row) {
      throw new NotFoundError("Dieser Eintrag existiert nicht mehr.");
    }
    const parsed = databaseItemSchema.parse(row);
    await markListUpdated(transaction, parsed.listId, actor.id);
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
