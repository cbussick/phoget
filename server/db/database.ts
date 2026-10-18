import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "../config.js";

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
});
export const database = drizzle(pool);
export type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
