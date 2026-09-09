import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { database } from "../db/database.js";
import { users, sessions, settings, loginAttempts } from "../db/schema.js";
import {
  userSchema,
  usersSchema,
  membersSchema,
  type User,
  type createUserSchema,
  type userInputSchema,
} from "../../shared/accounts.js";
import {
  accountAdministrationBlock,
  accountAdministrationMessages,
} from "../../shared/accountAdministration.js";
import { HttpError } from "../httpErrors.js";
import { hashPassword, verifyPassword } from "./passwords.js";

const storedUserSchema = userSchema.extend({ passwordHash: z.string() });
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
export const tokenDigest = (token: string) => createHash("sha256").update(token).digest("hex");
const dummyHash = "scrypt-v1$" + "0".repeat(32) + "$" + "0".repeat(128);
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];

async function lockAccounts(transaction: Transaction) {
  // The singleton household row serializes account administration, including bootstrap.
  await transaction
    .select({ id: settings.id })
    .from(settings)
    .where(eq(settings.id, 1))
    .for("update");
}
async function requireAdmin(transaction: Transaction, actorId: string) {
  const [row] = await transaction.select().from(users).where(eq(users.id, actorId));
  if (!row || userSchema.parse(row).role !== "admin" || row.mustChangePassword)
    throw new HttpError(403, "Administratorrechte sind erforderlich.");
}
export async function throttleLogin(key: string) {
  const now = new Date();
  await database.delete(loginAttempts).where(lt(loginAttempts.expiresAt, now));
  for (const [bucket, limit] of [
    ["global", 300],
    [tokenDigest(key), 30],
  ] as const) {
    const [row] = await database
      .insert(loginAttempts)
      .values({ key: bucket, count: 1, expiresAt: new Date(now.getTime() + 15 * 60 * 1000) })
      .onConflictDoUpdate({
        target: loginAttempts.key,
        set: { count: sql`${loginAttempts.count} + 1` },
      })
      .returning();
    if (z.object({ count: z.number().int() }).parse(row).count > limit)
      throw new HttpError(429, "Zu viele Versuche. Bitte versuche es in 15 Minuten erneut.");
  }
}
async function issueSession(transaction: Transaction, userId: string) {
  const token = randomBytes(32).toString("hex");
  await transaction.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await transaction.insert(sessions).values({
    userId,
    tokenHash: tokenDigest(token),
    expiresAt: new Date(Date.now() + sessionLifetime),
  });
  return token;
}
export async function signIn(username: string, password: string) {
  await throttleLogin(username);
  const [raw] = await database.select().from(users).where(eq(users.username, username));
  const stored = raw ? storedUserSchema.parse(raw) : null;
  const valid = await verifyPassword(password, stored?.passwordHash ?? dummyHash);
  if (!stored || !valid) throw new HttpError(401, "Benutzername oder Passwort ist falsch.");

  return database.transaction(async (transaction) => {
    await lockAccounts(transaction);
    const [current] = await transaction.select().from(users).where(eq(users.id, stored.id));
    if (!current || storedUserSchema.parse(current).passwordHash !== stored.passwordHash)
      throw new HttpError(401, "Benutzername oder Passwort ist falsch.");
    return { user: userSchema.parse(current), token: await issueSession(transaction, stored.id) };
  });
}
export async function readSession(token: string | undefined): Promise<User | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [row] = await database
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenDigest(token)), gt(sessions.expiresAt, new Date())));
  return row ? userSchema.parse(row.user) : null;
}
export async function signOut(token: string | undefined) {
  if (token) await database.delete(sessions).where(eq(sessions.tokenHash, tokenDigest(token)));
}
export async function readUsers() {
  return usersSchema.parse(
    await database.select().from(users).orderBy(asc(users.name), asc(users.id)),
  );
}
export async function readMembers() {
  return membersSchema.parse(
    await database
      .select({ id: users.id, name: users.name })
      .from(users)
      .orderBy(asc(users.name), asc(users.id)),
  );
}
export async function createAccount(input: z.infer<typeof createUserSchema>, actorId?: string) {
  const passwordHash = await hashPassword(input.password);
  return database.transaction(async (transaction) => {
    await lockAccounts(transaction);
    if (actorId) await requireAdmin(transaction, actorId);
    else if ((await transaction.select({ id: users.id }).from(users).limit(1)).length)
      throw new HttpError(409, "Der erste Administrator existiert bereits.");
    const [row] = await transaction
      .insert(users)
      .values({
        name: input.name,
        username: input.username,
        role: actorId ? input.role : "admin",
        passwordHash,
        mustChangePassword: Boolean(actorId),
      })
      .returning();
    return userSchema.parse(row);
  });
}
export async function editAccount(
  actorId: string,
  id: string,
  input: z.infer<typeof userInputSchema> | null,
) {
  return database.transaction(async (transaction) => {
    await lockAccounts(transaction);
    await requireAdmin(transaction, actorId);
    const stored = usersSchema.parse(await transaction.select().from(users));
    const target = stored.find((user) => user.id === id);
    if (!target) throw new HttpError(404, "Dieses Konto existiert nicht mehr.");
    const blocked = accountAdministrationBlock(
      actorId,
      target,
      stored.filter((user) => user.role === "admin").length,
      input ? "edit" : "delete",
      input?.role,
    );
    if (blocked) throw new HttpError(409, blocked);
    if (!input) {
      await transaction.delete(users).where(eq(users.id, id));
      return null;
    }
    const [row] = await transaction.update(users).set(input).where(eq(users.id, id)).returning();
    if (target.role !== input.role)
      await transaction.delete(sessions).where(eq(sessions.userId, id));
    return userSchema.parse(row);
  });
}
export async function editProfile(id: string, name: string) {
  const [row] = await database.update(users).set({ name }).where(eq(users.id, id)).returning();
  if (!row) throw new HttpError(401, "Bitte melde dich erneut an.");
  return userSchema.parse(row);
}
export async function changePassword(id: string, password: string, currentPassword: string) {
  await throttleLogin("password:" + id);
  const [row] = await database.select().from(users).where(eq(users.id, id));
  if (!row) throw new HttpError(401, "Bitte melde dich erneut an.");
  const stored = storedUserSchema.parse(row);
  if (!(await verifyPassword(currentPassword, stored.passwordHash)))
    throw new HttpError(400, "Das aktuelle Passwort ist falsch.", "currentPassword");
  if (password === currentPassword)
    throw new HttpError(400, "Wähle ein anderes Passwort.", "password");
  const passwordHash = await hashPassword(password);
  return database.transaction(async (transaction) => {
    await lockAccounts(transaction);
    const [updated] = await transaction
      .update(users)
      .set({ passwordHash, mustChangePassword: false })
      .where(and(eq(users.id, id), eq(users.passwordHash, stored.passwordHash)))
      .returning();
    if (!updated)
      throw new HttpError(409, "Dein Konto wurde geändert. Bitte melde dich erneut an.");
    await transaction.delete(sessions).where(eq(sessions.userId, id));
    return { user: userSchema.parse(updated), token: await issueSession(transaction, id) };
  });
}
export async function resetPassword(actorId: string, id: string, password: string) {
  const passwordHash = await hashPassword(password);
  return database.transaction(async (transaction) => {
    await lockAccounts(transaction);
    await requireAdmin(transaction, actorId);
    if (actorId === id) throw new HttpError(409, accountAdministrationMessages.selfReset);
    const [row] = await transaction
      .update(users)
      .set({ passwordHash, mustChangePassword: true })
      .where(eq(users.id, id))
      .returning();
    if (!row) throw new HttpError(404, "Dieses Konto existiert nicht mehr.");
    await transaction.delete(sessions).where(eq(sessions.userId, id));
    return userSchema.parse(row);
  });
}
