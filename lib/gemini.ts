import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini client with API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Get the generative model - using Gemini 2.0 Flash for text and analysis
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Generate an image using Google Gemini API
 * Note: Gemini API primarily generates text. For image generation, we'll use it to
 * create detailed prompts that can be used with other image generation services,
 * or we can integrate with Imagen API if available.
 * 
 * @param prompt - The text prompt describing the desired image
 * @param options - Optional parameters for image generation
 * @returns Object containing the generated image data or enhanced prompt
 */
export async function generateImage(prompt: string, options?: {
  negativePrompt?: string;
  style?: string;
  width?: number;
  height?: number;
}) {
  try {
    // Enhanced prompt with style modifiers if provided
    let enhancedPrompt = prompt;
    
    if (options?.style) {
      enhancedPrompt = `${prompt}, ${options.style} style, high quality, detailed, artistic, professional photography, 8k resolution`;
    }
    
    if (options?.negativePrompt) {
      enhancedPrompt = `${enhancedPrompt}, avoiding ${options.negativePrompt}`;
    }

    // Use Gemini to enhance the prompt and provide image generation guidance
    const promptEnhancement = await model.generateContent(
      `You are an expert AI image generation assistant. Enhance this image prompt for better results: "${prompt}". ` +
      `Style: ${options?.style || 'none'}. ` +
      `Provide a detailed, vivid description that will help generate a high-quality image. ` +
      `Return only the enhanced prompt, no other text.`
    );

    const enhancedText = await promptEnhancement.response.text();
    
    // For now, we'll return the enhanced prompt and indicate that image generation
    // would need to be handled by a dedicated image generation API
    // In a production environment, you would integrate with Google's Imagen API or another service
    
    return {
      success: true,
      enhancedPrompt: enhancedText,
      originalPrompt: prompt,
      style: options?.style,
      message: "Prompt enhanced successfully. Ready for image generation.",
      // Note: Actual image generation would require integration with Imagen API or similar
      requiresImageAPI: true
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // Check for rate limit error (HTTP 429)
    const errorMessage = error instanceof Error ? error.message : "Failed to enhance prompt";
    const isRateLimitError = errorMessage.includes("429") || 
                             errorMessage.includes("rate limit") ||
                             errorMessage.includes("too many requests") ||
                             errorMessage.includes("resource exhausted");
    
    if (isRateLimitError) {
      return {
        success: false,
        error: "Rate limit exceeded",
        isRateLimit: true,
        message: "You've reached the free tier limit. Please try again in a few minutes or upgrade your plan.",
        retryAfter: 60, // Suggest retry after 60 seconds
        prompt: prompt
      };
    }
    
    return {
      success: false,
      error: errorMessage,
      isRateLimit: false,
      prompt: prompt,
      requiresImageAPI: true
    };
  }
}

/**
 * Alternative: Direct image generation using Gemini 2.0 Flash's multimodal capabilities
 * This is a workaround that uses Gemini's vision capabilities
 */
export async function generateImageWithGemini(prompt: string, options?: {
  style?: string;
  negativePrompt?: string;
}) {
  try {
    let enhancedPrompt = prompt;
    
    if (options?.style) {
      enhancedPrompt = `${prompt} in ${options.style} style`;
    }
    
    // Ask Gemini to describe an image in extreme detail, which can be used as a prompt
    const result = await model.generateContent(
      `Create an extremely detailed, vivid description of an image based on this concept: "${enhancedPrompt}". ` +
      `Include specific details about lighting, composition, colors, textures, and mood. ` +
      `This description will be used to generate an actual image, so be very specific and visual. ` +
      `Format your response as a single paragraph of descriptive text.`
    );

    const description = await result.response.text();
    
    return {
      success: true,
      imageDescription: description,
      prompt: enhancedPrompt,
      style: options?.style,
      // This would need to be sent to an actual image generation API
      requiresImageAPI: true
    };

  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image description",
      prompt: prompt
    };
  }
}

/**
 * Generate multiple image variations
 */
export async function generateImageVariations(prompt: string, count: number = 2, options?: {
  style?: string;
  negativePrompt?: string;
}) {
  const variations = [];
  
  for (let i = 0; i < count; i++) {
    const result = await generateImage(prompt, options);
    if (result.success) {
      variations.push(result);
    }
  }
  
  return variations;
}

export default {
  generateImage,
  generateImageVariations
};