import { z } from "zod";
import { idSchema } from "./contracts.js";

export const roleSchema = z.enum(["admin", "user"]);
export const displayNameSchema = z.string().trim().min(1, "Gib einen Namen ein.").max(80);
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Verwende mindestens 3 Zeichen.")
  .max(40, "Verwende höchstens 40 Zeichen.")
  .regex(
    /^[a-z0-9._-]+$/,
    "Verwende Buchstaben (a–z), Zahlen, Punkte, Unterstriche oder Bindestriche.",
  );
export const passwordSchema = z.string().min(15, "Verwende mindestens 15 Zeichen.").max(128);
export const loginSchema = z
  .object({
    username: usernameSchema,
    password: z.string().min(1, "Gib dein Passwort ein.").max(128),
  })
  .strict();
export const userInputSchema = z
  .object({ name: displayNameSchema, username: usernameSchema, role: roleSchema })
  .strict();
export const createUserSchema = userInputSchema.extend({ password: passwordSchema });
export const userSchema = userInputSchema
  .extend({ id: idSchema, mustChangePassword: z.boolean() })
  .strip();
export const memberSchema = z.object({ id: idSchema, name: displayNameSchema });
export const membersSchema = z.array(memberSchema);
export const usersSchema = z.array(userSchema);
export const sessionSchema = z.object({ user: userSchema.nullable() });
export const profileSchema = z.object({ name: displayNameSchema }).strict();
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Gib dein aktuelles Passwort ein.").max(128),
    password: passwordSchema,
  })
  .strict();
export const resetPasswordSchema = z.object({ password: passwordSchema }).strict();
export type User = z.infer<typeof userSchema>;
export type Member = z.infer<typeof memberSchema>;
