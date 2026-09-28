import { eq, sql } from "drizzle-orm";
import { database } from "./database.js";
import { itemPhotos, items, lists } from "./schema.js";
import { NotFoundError } from "./repository.js";

export async function readItemPhoto(itemId: string) {
  const [photo] = await database
    .select({ data: itemPhotos.data })
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, itemId));
  if (!photo) throw new NotFoundError("Dieses Foto existiert nicht mehr.");
  return photo.data;
}

export async function changeItemPhoto(itemId: string, data: Buffer | null, actorId: string) {
  await database.transaction(async (tx) => {
    const [located] = await tx
      .select({ listId: items.listId })
      .from(items)
      .where(eq(items.id, itemId));
    if (!located) throw new NotFoundError("Dieser Eintrag existiert nicht mehr.");
    // Share the list lock order with item edits and list deletion before locking this row.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1011, hashtext(${located.listId}))`);
    const [item] = await tx
      .select({ listId: items.listId })
      .from(items)
      .where(eq(items.id, itemId))
      .for("update");
    if (!item) throw new NotFoundError("Dieser Eintrag existiert nicht mehr.");
    if (data) {
      await tx.insert(itemPhotos).values({ itemId, data }).onConflictDoUpdate({
        target: itemPhotos.itemId,
        set: { data },
      });
    } else {
      const deleted = await tx.delete(itemPhotos).where(eq(itemPhotos.itemId, itemId)).returning();
      if (!deleted.length) throw new NotFoundError("Dieses Foto existiert nicht mehr.");
    }
    await tx
      .update(lists)
      .set({ updatedAt: sql`clock_timestamp()`, updatedById: actorId })
      .where(eq(lists.id, item.listId));
  });
}
