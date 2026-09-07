import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { database } from "./database.js";
import { items, lists, settings } from "./schema.js";
import {
  itemSchema,
  listSchema,
  listInputSchema,
  settingsSchema,
  stateSchema,
} from "../../shared/contracts.js";

const databaseTimeSchema = z
  .string()
  .pipe(z.coerce.date())
  .transform((value) => value.toISOString());
const databaseListSchema = listSchema.extend({
  createdAt: databaseTimeSchema,
  updatedAt: databaseTimeSchema,
});
const databaseItemSchema = itemSchema.extend({ createdAt: databaseTimeSchema });
export class NotFoundError extends Error {}
export async function readState() {
  // A consistent snapshot avoids mismatched lists/items during concurrent deletion.
  return database.transaction(
    async (transaction) => {
      const storedLists = await transaction
        .select()
        .from(lists)
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
export async function createList(input: z.infer<typeof listInputSchema>) {
  const [row] = await database.insert(lists).values(input).returning();
  return databaseListSchema.parse(row);
}
export async function updateList(
  id: string,
  input: { name: string; description: string; icon: string },
) {
  const [row] = await database
    .update(lists)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(lists.id, id))
    .returning();
  if (!row) throw new NotFoundError("This list no longer exists.");
  return databaseListSchema.parse(row);
}
export async function deleteList(id: string) {
  const rows = await database.delete(lists).where(eq(lists.id, id)).returning();
  if (!rows.length) throw new NotFoundError("This list no longer exists.");
  databaseListSchema.parse(rows[0]);
}
export async function createItem(listId: string, input: { name: string; note: string }) {
  return database.transaction(async (transaction) => {
    const [parent] = await transaction
      .update(lists)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(lists.id, listId))
      .returning();
    if (!parent) throw new NotFoundError("This list no longer exists.");
    databaseListSchema.parse(parent);
    const [row] = await transaction
      .insert(items)
      .values({ ...input, listId })
      .returning();
    return databaseItemSchema.parse(row);
  });
}
export async function changeItem(
  id: string,
  input: { name?: string; note?: string; completed?: boolean } | null,
) {
  return database.transaction(async (transaction) => {
    const [row] =
      input === null
        ? await transaction.delete(items).where(eq(items.id, id)).returning()
        : await transaction.update(items).set(input).where(eq(items.id, id)).returning();
    if (!row) throw new NotFoundError("This item no longer exists.");
    const parsed = databaseItemSchema.parse(row);
    await transaction
      .update(lists)
      .set({ updatedAt: new Date().toISOString() })
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
