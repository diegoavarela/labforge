import { pgTable, uuid, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const skills = pgTable("plugins", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("plugin_name").notNull().default("Untitled"),
  data: jsonb("data").notNull().$type<Record<string, unknown>>(),
  isActive: boolean("is_active").default(false),
  published: boolean("published").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
