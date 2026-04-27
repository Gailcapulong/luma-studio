import {and, count, desc, eq, gte, type InferInsertModel} from "drizzle-orm";

import { generation } from "./schema";

import { db } from "@/db/index";

/** Start of current month (UTC), used for monthly generation quotas. */
export function utcMonthStart() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1, 0, 0, 0, 0));
}

export async function countGenerationsSince(clerkUserId: string, since: Date) {
  const [row] = await db
    .select({ c: count() })
    .from(generation)
    .where(and(eq(generation.clerkUserId, clerkUserId), gte(generation.createdAt, since)));

  return Number(row?.c ?? 0);
}

export async function listUserGenerationSummaries(clerkUserId: string) {
  return db
    .select()
    .from(generation)
    .where(eq(generation.clerkUserId, clerkUserId))
    .orderBy(desc(generation.createdAt));
}

type InsertGenerationInput = Omit<InferInsertModel<typeof generation>, "id" | "createdAt">;

export async function createGeneration(input: InsertGenerationInput) {
  const [row] = await db.insert(generation).values(input).returning();

  return row;
}