"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import NextImage from "next/image";

// Available styles for image generation
const AVAILABLE_STYLES = [
  { slug: "anime", label: "Anime", description: "Japanese animation style" },
  { slug: "oil-painting", label: "Oil Painting", description: "Classic oil painting aesthetic" },
  { slug: "watercolor", label: "Watercolor", description: "Soft watercolor effect" },
  { slug: "cyberpunk", label: "Cyberpunk", description: "Futuristic neon aesthetic" },
  { slug: "vintage", label: "Vintage", description: "Retro film photography look" },
  { slug: "3d-render", label: "3D Render", description: "Modern 3D computer graphics" },
  { slug: "sketch", label: "Pencil Sketch", description: "Hand-drawn sketch style" },
  { slug: "pop-art", label: "Pop Art", description: "Bold colors and Warhol-inspired" },
];

interface GenerationResult {
  success: boolean;
  generation?: {
    id: string;
    resultImageUrl: string;
    enhancedPrompt: string;
  };
  imageUrl?: string;
  enhancedPrompt?: string;
  message?: string;
  error?: string;
  note?: string;
  isRateLimit?: boolean;
  retryAfter?: number;
  details?: string;
}

interface BillingStatus {
  plan: string;
  planName: string;
  price: number;
  generationsUsed: number;
  generationsLimit: number;
  generationsRemaining: number;
  canGenerate: boolean;
  upgradeNeeded: boolean;
}

export function StudioGenerator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);
    }
  };

  // Handle drag and drop
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);
    }
  };

  // Fetch billing status
  const fetchBillingStatus = async () => {
    try {
      const response = await fetch("/api/billing/status");
      if (response.ok) {
        const data = await response.json();
        setBillingStatus(data);
      }
    } catch (error) {
      console.error("Error fetching billing status:", error);
    }
  };

  // Handle generate button click
  const handleGenerate = async () => {
    if (!prompt || !selectedStyle) {
      setError("Please provide a prompt and select a style");
      return;
    }

    // Check if user can generate
    if (billingStatus && !billingStatus.canGenerate) {
      setError(`Monthly limit reached (${billingStatus.generationsUsed}/${billingStatus.generationsLimit}). Please upgrade to continue.`);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationResult(null);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          style: selectedStyle,
          styleLabel: AVAILABLE_STYLES.find(s => s.slug === selectedStyle)?.label,
          originalImage: previewUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limit error (429) specially
        if (response.status === 429) {
          setGenerationResult({
            success: false,
            error: data.error || "Rate limit exceeded",
            isRateLimit: data.isRateLimit || true,
            message: data.message || "You've reached the free tier limit.",
            retryAfter: data.retryAfter || 60,
            details: data.details,
          });
          setError(data.error || "Rate limit exceeded");
        } else {
          throw new Error(data.error || "Failed to generate image");
        }
        return;
      }

      setGenerationResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
      // Refresh billing status after generation
      fetchBillingStatus();
    }
  };

  // Reset the form
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPrompt("");
    setSelectedStyle("");
    setGenerationResult(null);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">AI Image Studio</h1>
          {billingStatus && (
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Plan: </span>
                <span className="font-medium capitalize">{billingStatus.planName}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Generations: </span>
                <span className={`font-medium ${billingStatus.generationsRemaining <= 2 ? 'text-red-500' : ''}`}>
                  {billingStatus.generationsUsed}/{billingStatus.generationsLimit}
                </span>
              </div>
              {billingStatus.upgradeNeeded && (
                <a href="#pricing" className="text-sm text-primary hover:underline">
                  Upgrade Plan
                </a>
              )}
            </div>
          )}
        </div>
        <p className="text-muted-foreground">
          Upload an image, describe your vision, and transform it with AI-powered style transfer.
        </p>
        {/* Progress bar for generations */}
        {billingStatus && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Monthly Usage</span>
              <span>{billingStatus.generationsRemaining} remaining</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  billingStatus.generationsRemaining <= 2 
                    ? 'bg-red-500' 
                    : billingStatus.generationsRemaining <= 5 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${(billingStatus.generationsUsed / billingStatus.generationsLimit) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Input */}
        <div className="space-y-6">
          {/* Upload Section */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
            {previewUrl ? (
              <div className="relative">
                <NextImage
                  src={previewUrl}
                  alt="Preview"
                  width={400}
                  height={300}
                  className="rounded-lg max-h-64 mx-auto object-contain"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="absolute top-2 right-2"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <label
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="cursor-pointer block"
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Drop your image here</p>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline">Select Image</Button>
              </label>
            )}
          </div>

          {/* Prompt Input */}
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium mb-2">
              Describe your vision
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., A serene mountain landscape at sunset with vibrant colors..."
              rows={4}
              className="w-full px-3 py-2 border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Style Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Select a style</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {AVAILABLE_STYLES.map((style) => (
                <button
                  key={style.slug}
                  onClick={() => setSelectedStyle(style.slug)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedStyle === style.slug
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium text-sm">{style.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{style.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt || !selectedStyle}
            className="w-full h-12 text-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Image
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && generationResult?.isRateLimit ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800 text-sm mb-1">
                    {generationResult.error || "Rate Limit Exceeded"}
                  </p>
                  <p className="text-sm text-amber-700 mb-2">
                    {generationResult.message || "You've reached the free tier limit."}
                  </p>
                  {generationResult.details && (
                    <p className="text-xs text-amber-600 mb-3">
                      {generationResult.details}
                    </p>
                  )}
                  {generationResult.retryAfter && (
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-amber-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full animate-pulse"
                          style={{ width: '30%' }}
                        />
                      </div>
                      <span className="text-xs text-amber-700 whitespace-nowrap">
                        Try again in ~{generationResult.retryAfter}s
                      </span>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('https://ai.google.dev/pricing', '_blank')}
                    >
                      View Pricing
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : null}
        </div>

          {/* Right Column: Output */}
        <div className="space-y-6">
          <div className="border-2 border-dashed rounded-lg p-6 min-h-[400px] flex items-center justify-center">
            {generationResult?.success && generationResult.generation ? (
              <div className="text-center w-full">
                <div className="mb-4">
                  <NextImage
                    src={generationResult.imageUrl || generationResult.generation.resultImageUrl}
                    alt="Generated result"
                    width={512}
                    height={512}
                    className="rounded-lg max-h-96 mx-auto object-contain shadow-lg"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="font-medium">Generation Complete!</p>
                </div>
                {generationResult.enhancedPrompt && (
                  <div className="mt-4 text-left">
                    <p className="text-sm font-medium mb-1">Enhanced Prompt:</p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {generationResult.enhancedPrompt}
                    </p>
                  </div>
                )}
                <div className="mt-4 flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = generationResult.imageUrl || (generationResult.generation?.resultImageUrl);
                      if (url) window.open(url, '_blank');
                    }}
                  >
                    Open Full Size
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                  >
                    Create Another
                  </Button>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Creating your masterpiece...</p>
                <p className="text-xs text-muted-foreground mt-2">This may take 30-60 seconds</p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your generated image will appear here</p>
              </div>
            )}
          </div>

          {/* Generation Info */}
          {generationResult?.generation && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Generation Details</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">ID:</span> {generationResult.generation.id}
                </p>
                <p>
                  <span className="font-medium">Model:</span> Gemini 2.0 Flash
                </p>
                <p>
                  <span className="font-medium">Style:</span>{" "}
                  {AVAILABLE_STYLES.find((s) => s.slug === selectedStyle)?.label}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}