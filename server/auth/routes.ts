import { Router, type Request, type Response, type RequestHandler } from "express";
import { config } from "../config.js";
import { idSchema } from "../../shared/contracts.js";
import {
  sessionSchema,
  userSchema,
  loginSchema,
  profileSchema,
  changePasswordSchema,
  createUserSchema,
  userInputSchema,
  resetPasswordSchema,
  usersSchema,
  membersSchema,
} from "../../shared/accounts.js";
import { parseInput, HttpError } from "../httpErrors.js";
import {
  readSession,
  signIn,
  signOut,
  readUsers,
  readMembers,
  createAccount,
  editAccount,
  editProfile,
  changePassword,
  resetPassword,
} from "./accounts.js";

const secure = new URL(config.APP_ORIGIN).protocol === "https:";
const cookieName = secure ? "__Host-gather-session" : "gather-session";
const cookieOptions = { httpOnly: true, secure, sameSite: "strict" as const, path: "/" };
function token(request: Request) {
  return request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
}
function setSession(response: Response, value: string) {
  response.cookie(cookieName, value, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
}
export const authenticate: RequestHandler = async (request, response, next) => {
  const user = await readSession(token(request));
  if (!user) throw new HttpError(401, "Bitte melde dich an, um fortzufahren.");
  response.locals.user = user;
  next();
};
export const requireReady: RequestHandler = (_request, response, next) => {
  if (userSchema.parse(response.locals.user).mustChangePassword)
    throw new HttpError(403, "Ändere dein vorläufiges Passwort, um fortzufahren.");
  next();
};
export const adminOnly: RequestHandler = (_request, response, next) => {
  if (userSchema.parse(response.locals.user).role !== "admin")
    throw new HttpError(403, "Administratorrechte sind erforderlich.");
  next();
};
export const authRouter = Router();
authRouter.get("/session", async (request, response) =>
  response.json(sessionSchema.parse({ user: await readSession(token(request)) })),
);
authRouter.post("/session", async (request, response) => {
  const input = parseInput(loginSchema, request.body);
  const result = await signIn(input.username, input.password);
  await signOut(token(request));
  setSession(response, result.token);
  response.json(sessionSchema.parse({ user: result.user }));
});
authRouter.delete("/session", async (request, response) => {
  await signOut(token(request));
  response.clearCookie(cookieName, cookieOptions).status(204).end();
});
authRouter.patch("/account", authenticate, requireReady, async (request, response) => {
  const input = parseInput(profileSchema, request.body);
  response.json(
    userSchema.parse(await editProfile(userSchema.parse(response.locals.user).id, input.name)),
  );
});
authRouter.put("/account/password", authenticate, async (request, response) => {
  const input = parseInput(changePasswordSchema, request.body);
  const result = await changePassword(
    userSchema.parse(response.locals.user).id,
    input.password,
    input.currentPassword,
  );
  setSession(response, result.token);
  response.json(sessionSchema.parse({ user: result.user }));
});
export const usersRouter = Router();

usersRouter.get("/members", async (_request, response) =>
  response.json(membersSchema.parse(await readMembers())),
);
usersRouter.use("/users", adminOnly);
usersRouter.get("/users", async (_request, response) =>
  response.json(usersSchema.parse(await readUsers())),
);
usersRouter.post("/users", async (request, response) =>
  response
    .status(201)
    .json(
      userSchema.parse(
        await createAccount(
          parseInput(createUserSchema, request.body),
          userSchema.parse(response.locals.user).id,
        ),
      ),
    ),
);
usersRouter.put("/users/:id", async (request, response) =>
  response.json(
    userSchema.parse(
      await editAccount(
        userSchema.parse(response.locals.user).id,
        parseInput(idSchema, request.params.id),
        parseInput(userInputSchema, request.body),
      ),
    ),
  ),
);
usersRouter.delete("/users/:id", async (request, response) => {
  await editAccount(
    userSchema.parse(response.locals.user).id,
    parseInput(idSchema, request.params.id),
    null,
  );
  response.status(204).end();
});
usersRouter.put("/users/:id/password", async (request, response) => {
  const input = parseInput(resetPasswordSchema, request.body);
  response.json(
    userSchema.parse(
      await resetPassword(
        userSchema.parse(response.locals.user).id,
        parseInput(idSchema, request.params.id),
        input.password,
      ),
    ),
  );
});
