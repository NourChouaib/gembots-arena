import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "../../../../lib/ai-provider";

export async function POST(req: NextRequest) {
  try {
    const provider = getProvider();

    const { prompt, style } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // The enhancedPrompt logic is now within the the AI provider image generation
    const imageUrl = await provider.generateAvatar({ name: prompt, emoji: '', style });

    if (!imageUrl) {
      return NextResponse.json({ error: "AI provider did not return an image URL" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      image: imageUrl,
      prompt: prompt, // Original prompt, as enhancedPrompt is now internal to provider
    });
  } catch (error) {
    console.error("Avatar generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
