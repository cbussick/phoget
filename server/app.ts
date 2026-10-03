import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { readItemPhoto, changeItemPhoto } from "./db/itemPhotos.js";
import { processPhoto, maxUploadBytes } from "./photos/processPhoto.js";
import { HttpError, parseInput } from "./httpErrors.js";
import { userSchema } from "../shared/accounts.js";
import { authRouter, usersRouter, authenticate, requireReady, adminOnly } from "./auth/routes.js";
import { config } from "./config.js";
import {
  idSchema,
  itemInputSchema,
  itemPatchSchema,
  listInputSchema,
  listUpdateSchema,
  reorderSchema,
  settingsInputSchema,
  errorSchema,
  stateSchema,
  itemSchema,
  addItemResultSchema,
  itemHistorySchema,
  forgetItemSchema,
  forgetItemResultSchema,
  rememberedItemSchema,
  listSchema,
  settingsSchema,
} from "../shared/contracts.js";
import {
  readState,
  readItemHistory,
  forgetItem,
  restoreRememberedItem,
  createList,
  updateList,
  deleteList,
  createItem,
  changeItem,
  reorderLists,
  reorderItems,
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
app.use("/api", (request, response, next) => {
  const started = performance.now();
  const requestId = randomUUID();
  response.setHeader("X-Request-Id", requestId);
  response.once("finish", () => {
    // Use Express route templates, never raw URLs (which may contain IDs or query strings).
    const route = request.route?.path;
    console.info(
      JSON.stringify({
        event: "api_request",
        requestId,
        method: request.method,
        route:
          typeof route === "string"
            ? route.startsWith("/api/")
              ? route
              : `/api${route}`
            : "/api/unmatched",
        status: response.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
  });
  next();
});
app.use("/api", (_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", (request, response, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    if (request.get("X-Phoget-Request") !== "1") {
      response.status(403).json({ error: "Der Sicherheitsheader der Anfrage fehlt." });
      return;
    }
    if (request.get("Origin") && request.get("Origin") !== new URL(config.APP_ORIGIN).origin) {
      response.status(403).json(errorSchema.parse({ error: "Diese Herkunft ist nicht erlaubt." }));
      return;
    }
    if (request.get("Sec-Fetch-Site") === "cross-site") {
      response.status(403).json({ error: "Websiteübergreifende Anfragen sind nicht erlaubt." });
      return;
    }
    const photoUpload =
      request.method === "PUT" && /^\/items\/[0-9a-f-]+\/photo$/.test(request.path);
    if (!photoUpload && request.method !== "DELETE" && !request.is("application/json")) {
      response.status(415).json({ error: "Sende Daten im JSON-Format." });
      return;
    }
  }
  next();
});
app.use(express.json({ limit: "16kb" }));
app.get("/api/health", async (_request, response) => {
  await readState();
  response.json({ status: "ok" });
});
app.use("/api", authRouter);
app.use("/api", authenticate, requireReady);
app.use("/api", usersRouter);
app.get("/api/items/:id/photo", async (request, response) => {
  const data = await readItemPhoto(parseInput(idSchema, request.params.id));
  response.setHeader("Content-Type", "image/webp");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.send(data);
});
app.put(
  "/api/items/:id/photo",
  express.raw({
    type: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "application/octet-stream",
    ],
    limit: maxUploadBytes,
  }),
  async (request, response) => {
    const id = parseInput(idSchema, request.params.id);
    if (!Buffer.isBuffer(request.body)) throw new HttpError(415, "Ungültiger Bildtyp.");
    const data = await processPhoto(request.body);
    await changeItemPhoto(id, data, userSchema.parse(response.locals.user).id);
    response.status(204).end();
  },
);
app.delete("/api/items/:id/photo", async (request, response) => {
  await changeItemPhoto(
    parseInput(idSchema, request.params.id),
    null,
    userSchema.parse(response.locals.user).id,
  );
  response.status(204).end();
});
app.get("/api/state", async (_request, response) =>
  response.json(stateSchema.parse(await readState())),
);
app.post("/api/lists", async (request, response) => {
  const input = parseInput(listInputSchema, request.body);
  response
    .status(201)
    .json(listSchema.parse(await createList(input, userSchema.parse(response.locals.user))));
});
app.put("/api/lists/order", async (request, response) => {
  await reorderLists(parseInput(reorderSchema, request.body));
  response.status(204).end();
});
app.put("/api/lists/:id", async (request, response) => {
  response.json(
    listSchema.parse(
      await updateList(
        parseInput(idSchema, request.params.id),
        parseInput(listUpdateSchema, request.body),
        userSchema.parse(response.locals.user),
      ),
    ),
  );
});
app.put("/api/lists/:id/items/order/:completed", async (request, response) => {
  const completed = request.params.completed;
  if (completed !== "open" && completed !== "completed")
    throw new HttpError(400, "Ungültiger Abschnitt.");
  await reorderItems(
    parseInput(idSchema, request.params.id),
    completed === "completed",
    parseInput(reorderSchema, request.body),
  );
  response.status(204).end();
});
app.delete("/api/lists/:id", async (request, response) => {
  await deleteList(parseInput(idSchema, request.params.id));
  response.status(204).end();
});
app.get("/api/lists/:id/history", async (request, response) => {
  response.json(
    itemHistorySchema.parse(await readItemHistory(parseInput(idSchema, request.params.id))),
  );
});
app.delete("/api/lists/:id/history", async (request, response) => {
  response.json(
    forgetItemResultSchema.parse(
      await forgetItem(
        parseInput(idSchema, request.params.id),
        parseInput(forgetItemSchema, request.body),
        userSchema.parse(response.locals.user),
      ),
    ),
  );
});
app.post("/api/lists/:id/history", async (request, response) => {
  await restoreRememberedItem(
    parseInput(idSchema, request.params.id),
    parseInput(rememberedItemSchema.strict(), request.body),
  );
  response.status(204).end();
});
app.post("/api/lists/:id/items", async (request, response) => {
  const result = addItemResultSchema.parse(
    await createItem(
      parseInput(idSchema, request.params.id),
      parseInput(itemInputSchema, request.body),
      userSchema.parse(response.locals.user),
    ),
  );
  response.status(result.outcome === "created" ? 201 : 200).json(result);
});
app.patch("/api/items/:id", async (request, response) => {
  response.json(
    itemSchema.parse(
      await changeItem(
        parseInput(idSchema, request.params.id),
        parseInput(itemPatchSchema, request.body),
        userSchema.parse(response.locals.user),
      ),
    ),
  );
});
app.delete("/api/items/:id", async (request, response) => {
  await changeItem(
    parseInput(idSchema, request.params.id),
    null,
    userSchema.parse(response.locals.user),
  );
  response.status(204).end();
});
app.put("/api/settings", adminOnly, async (request, response) => {
  response.json(
    settingsSchema.parse(
      await updateSettings({ ...parseInput(settingsInputSchema, request.body), id: 1 }),
    ),
  );
});
app.use("/api", (_request, response) =>
  response.status(404).json({ error: "Endpunkt nicht gefunden." }),
);
if (config.NODE_ENV === "production") {
  const clientPath = resolve("dist/client");
  // Worktrees live under .worktrees; Express otherwise treats the absolute path as a dotfile.
  app.use(express.static(clientPath, { index: false, dotfiles: "allow" }));
  app.get(
    ["/", "/lists/:id", "/settings", "/all-lists.html", "/index.html"],
    (_request, response) =>
      response.sendFile(resolve(clientPath, "index.html"), { dotfiles: "allow" }),
  );
}
const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const status =
    error instanceof HttpError
      ? error.status
      : error instanceof NotFoundError
        ? 404
        : error.type === "entity.too.large"
          ? 413
          : error instanceof SyntaxError && "body" in error
            ? 400
            : 500;
  if (error?.cause?.code === "23505" || error?.code === "23505") {
    response
      .status(409)
      .json({ error: "Dieser Benutzername ist bereits vergeben.", field: "username" });
    return;
  }
  if (status === 500) console.error("Request failed", { name: error.name, code: error.code });
  response.status(status).json(
    errorSchema.parse({
      field: error instanceof HttpError ? error.field : undefined,
      error:
        status === 500
          ? "Etwas ist schiefgelaufen. Bitte versuche es erneut."
          : status === 413
            ? "Die Anfrage ist zu groß."
            : status === 400 && !(error instanceof HttpError)
              ? "Ungültiges JSON."
              : error.message,
    }),
  );
};
app.use(errorHandler);
