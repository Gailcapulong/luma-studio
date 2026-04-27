# Google Gemini API Integration Guide for Luma Studio

## Overview

This guide explains how to integrate Google Gemini API for AI-powered image generation in your Luma Studio application.

## ✅ What's Already Implemented

### 1. **SDK Installation**
- `@google/generative-ai` package is installed
- Gemini client is configured in `lib/gemini.ts`

### 2. **API Configuration**
- Your Gemini API key is already in `.env` file
- Client initialization is ready to use

### 3. **API Endpoints Created**
- `POST /api/generate-image` - Main image generation endpoint
- `GET /api/generations` - Fetch user's generation history

### 4. **Frontend Components**
- `StudioGenerator` component with full UI
- Image upload with drag & drop
- Style selection (8 different styles)
- Real-time generation with loading states
- Error handling and success feedback

## 🚀 How to Use the Current Implementation

### Step 1: Start Your Development Server
```bash
npm run dev
```

### Step 2: Access the Studio
1. Navigate to `http://localhost:3000/studio`
2. Sign in with your Clerk account (required)
3. Upload an image (optional)
4. Enter a descriptive prompt
5. Select a style
6. Click "Generate Image"

### Step 3: View Results
- The enhanced prompt will be displayed
- Generation details are saved to your database
- View your generation history via the API

## ⚠️ Important: Current Limitations

### Gemini API Limitations
**Google Gemini 2.0 Flash** (the model we're using) has the following characteristics:

1. **Text-First Model**: Gemini 2.0 Flash is primarily a text generation model
2. **No Direct Image Generation**: It cannot directly generate images like DALL-E or Midjourney
3. **What It CAN Do**:
   - Enhance and refine your image prompts
   - Generate detailed descriptions
   - Provide creative suggestions
   - Analyze and describe images

### Current Implementation Behavior
The current setup:
1. ✅ Takes your prompt and style selection
2. ✅ Uses Gemini to enhance the prompt
3. ✅ Saves the generation record to database
4. ⚠️ **Does NOT generate actual images** (requires additional API)

## 🔧 To Enable Actual Image Generation

You have several options to get real image generation working:

### Option 1: Google Imagen API (Recommended)
Google's dedicated image generation API.

**Steps:**
1. Enable Imagen API in Google Cloud Console
2. Get Imagen API credentials
3. Update `lib/gemini.ts` to use Imagen instead of Gemini
4. Modify the API endpoint to handle image responses

**Example Code Structure:**
```typescript
// In lib/gemini.ts, add Imagen client
import { ImageGenerationModel } from "@google/generative-ai";

const imagenModel = new ImageGenerationModel({
  apiKey: process.env.GEMINI_API_KEY,
  model: "imagen-3.0-generate-002"
});

export async function generateActualImage(prompt: string) {
  const result = await imagenModel.generateImages(prompt, {
    numberOfImages: 1,
    aspectRatio: "1:1"
  });
  return result.images[0].bytesBase64Encoded;
}
```

### Option 2: Use Alternative Free APIs

#### A. **Hugging Face Inference API** (Free Tier)
```typescript
const response = await fetch(
  "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: prompt })
  }
);
```

#### B. **Pollinations.AI** (Completely Free)
```typescript
// No API key needed!
const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=42&model=flux`;
```

#### C. **Replicate** (Free Credits)
```typescript
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const output = await replicate.run(
  "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea351df4979778f7e9332fd5ab",
  { input: { prompt } }
);
```

### Option 3: Use Gemini for Prompt Enhancement Only

Keep the current setup and use the enhanced prompts with another service:

```typescript
// 1. Use Gemini to enhance prompt (current implementation)
const enhancedPrompt = await generateImage(prompt, { style });

// 2. Send enhanced prompt to actual image generator
const imageUrl = await generateWithAnotherService(enhancedPrompt.enhancedPrompt);

// 3. Upload to ImageKit and save to database
```

## 📝 Environment Variables

Your `.env` file should contain:

```env
# Database
DATABASE_URL='your_database_url'

# ImageKit (for storing images)
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Optional: For actual image generation
# HUGGINGFACE_API_KEY=your_huggingface_key
# REPLICATE_API_TOKEN=your_replicate_token
```

## 🗄️ Database Schema

The `generation` table stores:
- `id` - Unique generation ID
- `clerkUserId` - User who generated the image
- `sourceImageUrl` - Original uploaded image
- `resultImageUrl` - Generated/styled image
- `styleSlug` - Style identifier (e.g., "anime", "oil-painting")
- `styleLabel` - Human-readable style name
- `model` - AI model used (e.g., "gemini-2.0-flash")
- `promptUsed` - The prompt sent to the AI
- `createdAt` - Timestamp

## 🎨 Available Styles

The system supports 8 built-in styles:
1. **Anime** - Japanese animation style
2. **Oil Painting** - Classic oil painting aesthetic
3. **Watercolor** - Soft watercolor effect
4. **Cyberpunk** - Futuristic neon aesthetic
5. **Vintage** - Retro film photography look
6. **3D Render** - Modern 3D computer graphics
7. **Pencil Sketch** - Hand-drawn sketch style
8. **Pop Art** - Bold colors and Warhol-inspired

## 🔍 Testing the Current Implementation

### Test the Gemini Integration
```bash
# Start your server
npm run dev

# In another terminal, test the API
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "style": "oil-painting",
    "styleLabel": "Oil Painting"
  }'
```

### Expected Response
```json
{
  "success": true,
  "generation": {
    "id": "uuid",
    "resultImageUrl": "/api/placeholder?prompt=...",
    "enhancedPrompt": "A breathtaking oil painting of a majestic sunset..."
  },
  "enhancedPrompt": "...",
  "message": "Prompt enhanced successfully.",
  "note": "This is a demonstration. Actual image generation requires integration with Google Imagen API or similar service."
}
```

## 🛠️ Next Steps for Full Implementation

### Priority 1: Choose an Image Generation Service
1. **For Production**: Google Imagen API or Replicate
2. **For Testing**: Pollinations.AI (free, no API key)
3. **For Balance**: Hugging Face (free tier available)

### Priority 2: Update the API Endpoint
Modify `app/api/generate-image/route.ts` to:
1. Call the actual image generation API
2. Convert the image to a Buffer
3. Upload to ImageKit using `uploadBufferToImageKit`
4. Save the real ImageKit URL to the database

### Priority 3: Add Image Display
Update the frontend to display actual generated images from ImageKit URLs

### Priority 4: Add Generation History UI
Create a page to browse and manage past generations

## 📚 Resources

### Official Documentation
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Google Imagen API](https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference/index)
- [Pollinations.AI](https://pollinations.ai/)
- [Replicate API](https://replicate.com/docs)

### Example Projects
- [Gemini API Examples](https://github.com/google-gemini/generative-ai-js)
- [Next.js Image Generation](https://nextjs.org/docs/app/building-your-application/optimizing/images)

## 💡 Tips

1. **Rate Limits**: Gemini free tier allows 15 requests/minute, 1000/day
2. **Error Handling**: Always handle API errors gracefully
3. **Caching**: Consider caching enhanced prompts to reduce API calls
4. **User Experience**: Show loading states and progress indicators
5. **Image Storage**: Use ImageKit for efficient image delivery

## 🆘 Troubleshooting

### "Unauthorized" Error
- Ensure you're signed in with Clerk
- Check that `CLERK_SECRET_KEY` is set correctly

### "API Key Invalid" Error
- Verify `GEMINI_API_KEY` in `.env` is correct
- Check that the API key has the necessary permissions

### Database Errors
- Ensure `DATABASE_URL` is correct
- Run `npm run db:push` to sync schema

### Image Not Displaying
- Check ImageKit credentials
- Verify the image URL is accessible
- Check browser console for CORS errors

## 📞 Support

If you need help:
1. Check the [Google AI Discord](https://discord.gg/google-ai)
2. Review [GitHub Issues](https://github.com/google-gemini/generative-ai-js/issues)
3. Consult the [Stack Overflow tag](https://stackoverflow.com/questions/tagged/google-gemini)

---

**Remember**: The current implementation provides a solid foundation. You just need to connect an actual image generation API to complete the workflow!