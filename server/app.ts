import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { resolve } from "node:path";
import { z } from "zod";
import { config } from "./config.js";
import {
  idSchema,
  itemInputSchema,
  itemPatchSchema,
  listInputSchema,
  settingsInputSchema,
  errorSchema,
  stateSchema,
  itemSchema,
  listSchema,
  settingsSchema,
} from "../shared/contracts.js";
import {
  readState,
  createList,
  updateList,
  deleteList,
  createItem,
  changeItem,
  updateSettings,
  NotFoundError,
} from "./db/repository.js";

export const app = express();
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'"],
        "style-src": ["'self'"],
        "upgrade-insecure-requests": new URL(config.APP_ORIGIN).protocol === "https:" ? [] : null,
      },
    },
    strictTransportSecurity: new URL(config.APP_ORIGIN).protocol === "https:",
  }),
);
app.use("/api", (_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", (request, response, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    if (request.get("Origin") && request.get("Origin") !== new URL(config.APP_ORIGIN).origin) {
      response.status(403).json(errorSchema.parse({ error: "This origin is not allowed." }));
      return;
    }
    if (request.get("Sec-Fetch-Site") === "cross-site") {
      response.status(403).json({ error: "Cross-site requests are not allowed." });
      return;
    }
    if (request.method !== "DELETE" && !request.is("application/json")) {
      response.status(415).json({ error: "Send JSON data." });
      return;
    }
  }
  next();
});
app.use(express.json({ limit: "16kb" }));
function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new InputError(result.error.issues[0]?.message ?? "Invalid request.");
  return result.data;
}
class InputError extends Error {}
app.get("/api/health", async (_request, response) => {
  await readState();
  response.json({ status: "ok" });
});
app.get("/api/state", async (_request, response) =>
  response.json(stateSchema.parse(await readState())),
);
app.post("/api/lists", async (request, response) => {
  const input = parseInput(listInputSchema, request.body);
  response.status(201).json(listSchema.parse(await createList(input)));
});
app.put("/api/lists/:id", async (request, response) => {
  response.json(
    listSchema.parse(
      await updateList(
        parseInput(idSchema, request.params.id),
        parseInput(listInputSchema, request.body),
      ),
    ),
  );
});
app.delete("/api/lists/:id", async (request, response) => {
  await deleteList(parseInput(idSchema, request.params.id));
  response.status(204).end();
});
app.post("/api/lists/:id/items", async (request, response) => {
  response
    .status(201)
    .json(
      itemSchema.parse(
        await createItem(
          parseInput(idSchema, request.params.id),
          parseInput(itemInputSchema, request.body),
        ),
      ),
    );
});
app.patch("/api/items/:id", async (request, response) => {
  response.json(
    itemSchema.parse(
      await changeItem(
        parseInput(idSchema, request.params.id),
        parseInput(itemPatchSchema, request.body),
      ),
    ),
  );
});
app.delete("/api/items/:id", async (request, response) => {
  await changeItem(parseInput(idSchema, request.params.id), null);
  response.status(204).end();
});
app.put("/api/settings", async (request, response) => {
  response.json(
    settingsSchema.parse(
      await updateSettings({ ...parseInput(settingsInputSchema, request.body), id: 1 }),
    ),
  );
});
app.use("/api", (_request, response) =>
  response.status(404).json({ error: "Endpoint not found." }),
);
if (config.NODE_ENV === "production") {
  const clientPath = resolve("dist/client");
  app.use(express.static(clientPath, { index: false }));
  app.get(
    ["/", "/lists/:id", "/settings", "/all-lists.html", "/index.html"],
    (_request, response) => response.sendFile(resolve(clientPath, "index.html")),
  );
}
const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const status =
    error instanceof InputError
      ? 400
      : error instanceof NotFoundError
        ? 404
        : error.type === "entity.too.large"
          ? 413
          : error instanceof SyntaxError && "body" in error
            ? 400
            : 500;
  if (status === 500) console.error("Request failed", { name: error.name, code: error.code });
  response.status(status).json(
    errorSchema.parse({
      error:
        status === 500
          ? "Something went wrong. Please try again."
          : status === 413
            ? "The request is too large."
            : status === 400 && !(error instanceof InputError)
              ? "Invalid JSON."
              : error.message,
    }),
  );
};
app.use(errorHandler);
