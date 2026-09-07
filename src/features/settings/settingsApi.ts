import { z } from "zod";
import { request } from "../../shared/api/request";
import { settingsInputSchema, settingsSchema } from "../../../shared/contracts";
export function saveSettings(input: z.input<typeof settingsInputSchema>) {
  return request("/settings", settingsSchema, {
    method: "PUT",
    body: JSON.stringify(settingsInputSchema.parse(input)),
  });
}
