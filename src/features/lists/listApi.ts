import { z } from "zod";
import { request } from "../../shared/api/request";
import {
  listInputSchema,
  listUpdateSchema,
  listSchema,
  itemInputSchema,
  itemPatchSchema,
  itemSchema,
  reorderSchema,
} from "../../../shared/contracts";

export const listApi = {
  reorderLists: (input: z.input<typeof reorderSchema>) =>
    request("/lists/order", z.undefined(), {
      method: "PUT",
      body: JSON.stringify(reorderSchema.parse(input)),
    }),
  reorderItems: (id: string, section: "open" | "completed", input: z.input<typeof reorderSchema>) =>
    request(`/lists/${id}/items/order/${section}`, z.undefined(), {
      method: "PUT",
      body: JSON.stringify(reorderSchema.parse(input)),
    }),
  create: (input: z.input<typeof listInputSchema>) =>
    request("/lists", listSchema, {
      method: "POST",
      body: JSON.stringify(listInputSchema.parse(input)),
    }),
  update: (id: string, input: z.input<typeof listUpdateSchema>) =>
    request("/lists/" + id, listSchema, {
      method: "PUT",
      body: JSON.stringify(listUpdateSchema.parse(input)),
    }),
  remove: (id: string) => request("/lists/" + id, z.undefined(), { method: "DELETE" }),
  addItem: (id: string, input: z.input<typeof itemInputSchema>) =>
    request("/lists/" + id + "/items", itemSchema, {
      method: "POST",
      body: JSON.stringify(itemInputSchema.parse(input)),
    }),
  editItem: (id: string, input: z.input<typeof itemPatchSchema>) =>
    request("/items/" + id, itemSchema, {
      method: "PATCH",
      body: JSON.stringify(itemPatchSchema.parse(input)),
    }),
  removeItem: (id: string) => request("/items/" + id, z.undefined(), { method: "DELETE" }),
};
