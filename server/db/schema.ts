import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const lists = pgTable("lists", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  description: text().notNull().default(""),
  icon: text().notNull().default("shop"),
  createdAt: timestamp({ withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true, mode: "string" }).notNull().defaultNow(),
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
  memberOne: text().notNull(),
  memberTwo: text().notNull(),
  suggestions: jsonb().$type<string[]>().notNull(),
});
