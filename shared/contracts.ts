import { z } from "zod";

export const idSchema = z.uuid();
export const iconSchema = z.enum(["shop", "home", "travel", "tools", "heart"]);
const nameSchema = z.string().trim().min(1, "Enter a name.").max(200);
export const listInputSchema = z
  .object({
    name: nameSchema,
    description: z.string().trim().max(1000).default(""),
    icon: iconSchema.default("shop"),
  })
  .strict();
export const itemInputSchema = z
  .object({
    name: nameSchema,
    note: z.string().trim().max(2000).default(""),
  })
  .strict();
export const itemPatchSchema = z
  .object({
    name: nameSchema.optional(),
    note: z.string().trim().max(2000).optional(),
    completed: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a change.");
export const settingsInputSchema = z
  .object({
    householdName: nameSchema,
    memberOne: z.string().trim().min(1).max(80),
    memberTwo: z.string().trim().min(1).max(80),
    suggestions: z.array(nameSchema).max(10),
  })
  .strict();
export const listSchema = listInputSchema.extend({
  id: idSchema,
  updatedAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});
export const itemSchema = itemInputSchema.extend({
  id: idSchema,
  listId: idSchema,
  completed: z.boolean(),
  createdAt: z.iso.datetime(),
});
export const settingsSchema = settingsInputSchema.extend({ id: z.literal(1) });
export const stateSchema = z.object({
  lists: z.array(listSchema),
  items: z.array(itemSchema),
  settings: settingsSchema,
});
export const errorSchema = z.object({ error: z.string() });
export type List = z.infer<typeof listSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type State = z.infer<typeof stateSchema>;
