import { settings } from "./schema.js";
import { database, pool } from "./database.js";
try {
  await database
    .insert(settings)
    .values({
      id: 1,
      householdName: "Unser Haushalt",
    })
    .onConflictDoNothing();
  console.log("Household initialized. Create the first administrator with npm run account:setup.");
} finally {
  await pool.end();
}
