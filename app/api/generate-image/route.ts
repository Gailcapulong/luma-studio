import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateImage } from "@/lib/gemini";
import { db } from "@/db";
import { generation } from "@/db/schema";
import { uploadBufferToImageKit } from "@/lib/imagekit";
import { protectApiRoute, trackGeneration, getUserPlan } from "@/lib/billing";
import * as Sentry from "@sentry/nextjs";

// Style modifiers for image generation
const STYLE_MODIFIERS: Record<string, string> = {
  "anime": "anime style, vibrant colors, detailed animation",
  "oil-painting": "oil painting style, textured brushstrokes, classical art",
  "watercolor": "watercolor painting, soft edges, translucent layers",
  "cyberpunk": "cyberpunk aesthetic, neon lights, futuristic, high tech",
  "vintage": "vintage photograph, retro film look, sepia tones, aged",
  "3d-render": "3D render, computer graphics, high detail, modern",
  "sketch": "pencil sketch, hand drawn, graphite, artistic lines",
  "pop-art": "pop art style, bold colors, Warhol inspired, graphic"
};

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // Parse request body
    const { prompt, style, styleLabel, originalImage } = await request.json();

    // Validate required fields
    if (!prompt || !style) {
      return NextResponse.json(
        { error: "Prompt and style are required" },
        { status: 400 }
      );
    }

    // Check billing/usage limits
    const billingCheck = await protectApiRoute(userId, { styleSlug: style });
    if (!billingCheck.allowed) {
      return NextResponse.json(
        { error: billingCheck.error },
        { status: billingCheck.status }
      );
    }

    // Generate image using Gemini
    const generationResult = await generateImage(prompt, {
      style: style,
    });

    if (!generationResult.success) {
      // Handle rate limit errors specifically
      if (generationResult.isRateLimit) {
        return NextResponse.json(
          {
            error: generationResult.error || "Rate limit exceeded",
            message: generationResult.message,
            isRateLimit: true,
            retryAfter: generationResult.retryAfter || 60,
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: generationResult.error || "Failed to generate image" },
        { status: 500 }
      );
    }

    const enhancedPrompt = generationResult.enhancedPrompt || prompt;
    
    // Build the final prompt with style modifiers
    const styleModifier = STYLE_MODIFIERS[style] || style;
    const finalPrompt = `${enhancedPrompt}, ${styleModifier}, high quality, detailed, 4k`;
    
    // Generate actual image using Pollinations.AI (free, no API key required)
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&seed=${Date.now()}&model=flux&nologo=true`;
    
    // Fetch the image from Pollinations.AI
    const imageResponse = await fetch(pollinationsUrl);
    
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to generate image from Pollinations.AI" },
        { status: 500 }
      );
    }
    
    // Get the image as a buffer
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    // Upload to ImageKit for persistent storage
    const fileName = `generation-${userId}-${Date.now()}.jpg`;
    const uploadResult = await uploadBufferToImageKit({
      buffer: imageBuffer,
      fileName,
      folder: "/generations",
      mimeType: "image/jpeg",
    });
    
    // Save generation record to database
    const [savedGeneration] = await db
      .insert(generation)
      .values({
        clerkUserId: userId,
        sourceImageUrl: originalImage || "/placeholder.png",
        resultImageUrl: uploadResult.url,
        styleSlug: style,
        styleLabel: styleLabel || style,
        model: "gemini-2.0-flash + pollinations.ai",
        promptUsed: enhancedPrompt,
      })
      .returning();

    // Track generation for billing
    const userPlan = await getUserPlan(userId);
    await trackGeneration(userId, savedGeneration.id, userPlan);

    // Set Sentry user context for tracking
    Sentry.setUser({ id: userId });
    Sentry.setTag("plan", userPlan);
    Sentry.setTag("generation_id", savedGeneration.id);

    return NextResponse.json({
      success: true,
      generation: savedGeneration,
      enhancedPrompt: generationResult.enhancedPrompt,
      message: generationResult.message,
      imageUrl: uploadResult.url,
    });

  } catch (error) {
    console.error("Image generation API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Image generation API endpoint",
    methods: ["POST"],
    requiredFields: ["prompt", "style"],
    optionalFields: ["originalImage", "styleLabel"]
  });
}