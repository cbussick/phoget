import { z } from "zod";
import { DEFAULT_LIST_COLOR, hexColorSchema } from "./colors.js";

// Shared by browser forms and API validation, including built-in length errors.
z.config(z.locales.de());

export const idSchema = z.uuid();
export const iconSchema = z.enum([
  "shop",
  "home",
  "travel",
  "tools",
  "heart",
  "cart",
  "bubbles",
  "cleaning",
  "city",
  "rice",
  "sewing",
]);
const nameSchema = z.string().trim().min(1, "Gib einen Namen ein.").max(200);
export const listInputSchema = z
  .object({
    name: nameSchema,
    description: z.string().trim().max(1000).default(""),
    icon: iconSchema.default("shop"),
    color: hexColorSchema.default(DEFAULT_LIST_COLOR),
  })
  .strict();
// Older clients may omit color when renaming a list; keep its saved color.
export const listUpdateSchema = listInputSchema.extend({ color: hexColorSchema.optional() });
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
  .refine((value) => Object.keys(value).length > 0, "Gib eine Änderung an.");
export const settingsInputSchema = z
  .object({
    householdName: nameSchema,
  })
  .strict();
export const listSchema = listInputSchema.extend({
  id: idSchema,
  updatedAt: z.iso.datetime(),
  updatedBy: z.string().nullable().default(null),
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
export const oftenBoughtItemSchema = z.object({
  name: nameSchema,
  completionCount: z.number().int().positive(),
});
export const itemHistorySchema = z.object({
  names: z.array(nameSchema),
  oftenBought: z.array(oftenBoughtItemSchema).max(3),
});
export const errorSchema = z.object({ error: z.string(), field: z.string().optional() });
export type List = z.infer<typeof listSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type State = z.infer<typeof stateSchema>;
