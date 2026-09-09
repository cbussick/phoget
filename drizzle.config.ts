import { config as environment } from "./server/config";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  dbCredentials: { url: environment.DATABASE_URL },
});
