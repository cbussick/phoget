import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { resolve } from "node:path";
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
  settingsInputSchema,
  errorSchema,
  stateSchema,
  itemSchema,
  itemHistorySchema,
  listSchema,
  settingsSchema,
} from "../shared/contracts.js";
import {
  readState,
  readItemHistory,
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
    if (request.get("X-Gather-Request") !== "1") {
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
    if (request.method !== "DELETE" && !request.is("application/json")) {
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
app.get("/api/state", async (_request, response) =>
  response.json(stateSchema.parse(await readState())),
);
app.post("/api/lists", async (request, response) => {
  const input = parseInput(listInputSchema, request.body);
  response
    .status(201)
    .json(listSchema.parse(await createList(input, userSchema.parse(response.locals.user))));
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
app.delete("/api/lists/:id", async (request, response) => {
  await deleteList(parseInput(idSchema, request.params.id));
  response.status(204).end();
});
app.get("/api/lists/:id/history", async (request, response) => {
  response.json(
    itemHistorySchema.parse(await readItemHistory(parseInput(idSchema, request.params.id))),
  );
});
app.post("/api/lists/:id/items", async (request, response) => {
  response
    .status(201)
    .json(
      itemSchema.parse(
        await createItem(
          parseInput(idSchema, request.params.id),
          parseInput(itemInputSchema, request.body),
          userSchema.parse(response.locals.user),
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
  app.use(express.static(clientPath, { index: false }));
  app.get(
    ["/", "/lists/:id", "/settings", "/all-lists.html", "/index.html"],
    (_request, response) => response.sendFile(resolve(clientPath, "index.html")),
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
