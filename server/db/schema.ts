import {
  pgTable,
  primaryKey,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";

import { DEFAULT_LIST_COLOR } from "../../shared/colors.js";

export const lists = pgTable("lists", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  description: text().notNull().default(""),
  icon: text().notNull().default("shop"),
  color: text().notNull().default(DEFAULT_LIST_COLOR),
  createdAt: timestamp({ withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedById: uuid().references(() => users.id, { onDelete: "set null" }),
});
export const items = pgTable(
  "items",
  {
    id: uuid().primaryKey().defaultRandom(),
    listId: uuid()
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    name: text().notNull(),
    note: text().notNull().default(""),
    completed: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("items_list_id_idx").on(table.listId)],
);
export const settings = pgTable("settings", {
  id: integer().primaryKey(),
  householdName: text().notNull(),
});

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  username: text().notNull().unique(),
  role: text({ enum: ["admin", "user"] }).notNull(),
  passwordHash: text().notNull(),
  mustChangePassword: boolean().notNull().default(true),
});
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_expiry_idx").on(table.expiresAt),
  ],
);
export const loginAttempts = pgTable("login_attempts", {
  key: text().primaryKey(),
  count: integer().notNull(),
  expiresAt: timestamp({ withTimezone: true, mode: "date" }).notNull(),
});

export const itemNames = pgTable(
  "item_names",
  {
    listId: uuid()
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    key: text().notNull(),
    name: text().notNull(),
    completionCount: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.listId, table.key] })],
);
