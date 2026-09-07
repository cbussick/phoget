import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z
    .url()
    .refine((value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol)),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().min(1).default("127.0.0.1"),
  APP_ORIGIN: z
    .url()
    .refine(
      (value) => ["http:", "https:"].includes(new URL(value).protocol),
      "Use an HTTP or HTTPS origin.",
    )
    .default("http://127.0.0.1:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});
export const config = environmentSchema.parse(process.env);
