import { logger } from "../shared/logging.js";
import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db/database.js";
import { readState } from "./db/repository.js";

await readState();
const server = app.listen(config.PORT, config.HOST, () =>
  logger.log(`Phoget listening on http://${config.HOST}:${config.PORT}`),
);
function shutdown() {
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
pool.on("error", (error) => logger.error("Database connection error", { name: error.name }));
