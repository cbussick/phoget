import { migrate } from "drizzle-orm/node-postgres/migrator";
import { settings } from "./schema.js";
import { database, pool } from "./database.js";

try {
  await migrate(database, { migrationsFolder: "drizzle" });
  await database
    .insert(settings)
    .values({
      id: 1,
      householdName: "Our household",
      memberOne: "M",
      memberTwo: "J",
      suggestions: ["Bananas", "Oat milk", "Coffee"],
    })
    .onConflictDoNothing();
  console.log("Database migrations complete.");
} finally {
  await pool.end();
}
