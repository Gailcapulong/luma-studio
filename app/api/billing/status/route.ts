import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBillingStatus, PLANS } from "@/lib/billing";
import * as Sentry from "@sentry/nextjs";

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

    // Get billing status
    const status = await getBillingStatus(userId);

    // Add available plans for upgrade suggestions
    const response = {
      ...status,
      availablePlans: Object.entries(PLANS).map(([key, plan]) => ({
        id: key,
        name: plan.name,
        price: plan.price,
        features: plan.features,
        isCurrent: key === status.plan,
      })),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Billing status error:", error);
    Sentry.captureException(error, {
      tags: { feature: "billing" },
    });
    return NextResponse.json(
      { error: "Failed to fetch billing status" },
      { status: 500 }
    );
  }
}