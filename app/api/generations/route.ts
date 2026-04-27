import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { generation } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch user's generations from database
    const userGenerations = await db
      .select()
      .from(generation)
      .where(eq(generation.clerkUserId, userId))
      .orderBy(desc(generation.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCount = await db
      .select({ count: generation.id })
      .from(generation)
      .where(eq(generation.clerkUserId, userId));

    return NextResponse.json({
      success: true,
      generations: userGenerations,
      pagination: {
        total: totalCount.length,
        limit,
        offset,
        hasMore: userGenerations.length === limit
      }
    });

  } catch (error) {
    console.error("Error fetching generations:", error);
    return NextResponse.json(
      { error: "Failed to fetch generations" },
      { status: 500 }
    );
  }
}