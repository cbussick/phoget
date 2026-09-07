import { z } from "zod";
import { request } from "../../shared/api/request";
import {
  listInputSchema,
  listSchema,
  itemInputSchema,
  itemPatchSchema,
  itemSchema,
} from "../../../shared/contracts";

export const listApi = {
  create: (input: z.input<typeof listInputSchema>) =>
    request("/lists", listSchema, {
      method: "POST",
      body: JSON.stringify(listInputSchema.parse(input)),
    }),
  update: (id: string, input: z.input<typeof listInputSchema>) =>
    request("/lists/" + id, listSchema, {
      method: "PUT",
      body: JSON.stringify(listInputSchema.parse(input)),
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
