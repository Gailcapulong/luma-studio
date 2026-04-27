import { pgTable, uuid, text, timestamp, integer, decimal } from "drizzle-orm/pg-core";

export const generation = pgTable("generation", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull(),
  originalFileName: text("original_file_name"),
  sourceImageUrl: text("source_image_url").notNull(),
  resultImageUrl: text("result_image_url").notNull(),
  styleSlug: text("style_slug").notNull(),
  styleLabel: text("style_label").notNull(),
  model: text("model").notNull(),
  promptUsed: text("prompt_used").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Subscriptions table for billing
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull(),
  plan: text("plan").notNull(), // "free", "pro", "studio"
  status: text("status").notNull().default("active"), // "active", "cancelled", "expired"
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: text("cancel_at_period_end").default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
