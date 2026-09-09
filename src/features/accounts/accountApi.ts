import { z } from "zod";
import { request } from "../../shared/api/request";
import {
  sessionSchema,
  profileSchema,
  userSchema,
  changePasswordSchema,
  loginSchema,
  createUserSchema,
  userInputSchema,
  resetPasswordSchema,
} from "../../../shared/accounts";
export const accountApi = {
  login: (input: z.input<typeof loginSchema>) =>
    request("/session", sessionSchema, {
      method: "POST",
      body: JSON.stringify(loginSchema.parse(input)),
    }),
  logout: () => request("/session", z.undefined(), { method: "DELETE" }),
  profile: (input: z.input<typeof profileSchema>) =>
    request("/account", userSchema, {
      method: "PATCH",
      body: JSON.stringify(profileSchema.parse(input)),
    }),
  password: (input: z.input<typeof changePasswordSchema>) =>
    request("/account/password", sessionSchema, {
      method: "PUT",
      body: JSON.stringify(changePasswordSchema.parse(input)),
    }),
  create: (input: z.input<typeof createUserSchema>) =>
    request("/users", userSchema, {
      method: "POST",
      body: JSON.stringify(createUserSchema.parse(input)),
    }),
  edit: (id: string, input: z.input<typeof userInputSchema>) =>
    request("/users/" + id, userSchema, {
      method: "PUT",
      body: JSON.stringify(userInputSchema.parse(input)),
    }),
  remove: (id: string) => request("/users/" + id, z.undefined(), { method: "DELETE" }),
  resetPassword: (id: string, input: z.input<typeof resetPasswordSchema>) =>
    request("/users/" + id + "/password", userSchema, {
      method: "PUT",
      body: JSON.stringify(resetPasswordSchema.parse(input)),
    }),
};
