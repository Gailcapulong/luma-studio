import * as Sentry from "@sentry/nextjs";

// Plan definitions with usage limits
export interface PlanConfig {
  name: string;
  price: number;
  monthlyGenerationLimit: number;
  maxResolution: string;
  styles: string[];
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    name: "Free",
    price: 0,
    monthlyGenerationLimit: 10,
    maxResolution: "1024x1024",
    styles: ["anime", "sketch", "watercolor"],
    features: ["Basic styles", "Standard resolution", "10 generations/month"],
  },
  pro: {
    name: "Pro",
    price: 19.99,
    monthlyGenerationLimit: 100,
    maxResolution: "2048x2048",
    styles: ["all"],
    features: ["All styles", "High resolution", "100 generations/month", "Priority processing"],
  },
  studio: {
    name: "Studio",
    price: 49.99,
    monthlyGenerationLimit: 500,
    maxResolution: "4096x4096",
    styles: ["all"],
    features: ["All styles", "Maximum resolution", "500 generations/month", "API access", "Commercial license"],
  },
};

export type PlanType = "free" | "pro" | "studio";

/**
 * Get user's current plan from Clerk metadata
 */
export async function getUserPlan(userId: string): Promise<PlanType> {
  try {
    // Check if user has an active subscription in database
    const { db } = await import("@/db");
    const { subscriptions } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    
    const userSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.clerkUserId, userId))
      .limit(1);
    
    if (userSubscriptions.length > 0 && userSubscriptions[0].status === "active") {
      const userPlan = userSubscriptions[0].plan;
      if (userPlan === "pro" || userPlan === "studio") {
        return userPlan;
      }
    }
    
    return "free";
  } catch (error) {
    console.error("Error fetching user plan:", error);
    Sentry.captureException(error, {
      tags: { userId, feature: "billing" },
    });
    return "free";
  }
}

/**
 * Check if user has exceeded their monthly generation limit
 */
export async function checkGenerationLimit(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: PlanType;
}> {
  const plan = await getUserPlan(userId);
  const planConfig = PLANS[plan];
  const monthlyLimit: number = planConfig.monthlyGenerationLimit;
  
  try {
    const { db } = await import("@/db");
    const { generation } = await import("@/db/schema");
    const { eq, and, gte } = await import("drizzle-orm");
    
    // Count generations this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ count: generation.id })
      .from(generation)
      .where(
        and(
          eq(generation.clerkUserId, userId),
          gte(generation.createdAt, startOfMonth)
        )
      );
    
    // Ensure used is a number
    const used: number = result.length > 0 ? Number(result[0].count) : 0;
    const allowed = used < monthlyLimit;
    
    // Track usage with Sentry
    Sentry.setContext("usage", {
      plan,
      used,
      limit: monthlyLimit,
      remaining: monthlyLimit - used,
      allowed,
    });
    
    return { allowed, used, limit: monthlyLimit, plan };
  } catch (error) {
    console.error("Error checking generation limit:", error);
    Sentry.captureException(error, {
      tags: { userId, plan, feature: "billing" },
    });
    // Allow on error to avoid blocking legitimate users
    return { allowed: true, used: 0, limit: monthlyLimit, plan };
  }
}

/**
 * Check if a style is available for the user's plan
 */
export function isStyleAvailable(styleSlug: string, plan: PlanType): boolean {
  const planConfig = PLANS[plan];
  
  if (planConfig.styles[0] === "all") {
    return true;
  }
  
  return planConfig.styles.includes(styleSlug);
}

/**
 * Track a generation event for billing purposes
 */
export async function trackGeneration(userId: string, generationId: string, plan: PlanType) {
  Sentry.captureMessage("generation_completed", {
    level: "info",
    tags: {
      feature: "billing",
      plan,
      generationId,
    },
    extra: {
      userId,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Get billing status for display to user
 */
export async function getBillingStatus(userId: string) {
  const { allowed, used, limit, plan } = await checkGenerationLimit(userId);
  const planConfig = PLANS[plan];
  
  return {
    plan,
    planName: planConfig.name,
    price: planConfig.price,
    generationsUsed: used,
    generationsLimit: limit,
    generationsRemaining: limit - used,
    isUnlimited: limit === -1,
    canGenerate: allowed,
    upgradeNeeded: !allowed,
  };
}

/**
 * Middleware to protect API routes based on billing
 */
export async function protectApiRoute(
  userId: string,
  options?: { styleSlug?: string }
): Promise<{ allowed: boolean; error?: string; status?: number }> {
  const { allowed, used, limit, plan } = await checkGenerationLimit(userId);
  const planConfig = PLANS[plan];
  
  if (!allowed) {
    // Track limit exceeded event
    Sentry.captureMessage("generation_limit_exceeded", {
      level: "warning",
      tags: {
        feature: "billing",
        plan,
        userId,
      },
      extra: {
        used,
        limit,
        styleSlug: options?.styleSlug,
      },
    });
    
    return {
      allowed: false,
      error: `Monthly generation limit reached (${used}/${limit}). Please upgrade your plan to continue.`,
      status: 429,
    };
  }
  
  // Check style availability
  if (options?.styleSlug && !isStyleAvailable(options.styleSlug, plan)) {
    return {
      allowed: false,
      error: `This style is not available in your ${planConfig.name} plan. Please upgrade to access this style.`,
      status: 403,
    };
  }
  
  return { allowed: true };
}