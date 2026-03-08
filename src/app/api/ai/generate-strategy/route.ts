import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "../../../../lib/ai-provider";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const provider = getProvider();

    const { description } = await req.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Strategy description is required" },
        { status: 400 }
      );
    }

    const strategy = await provider.generateStrategy(description);

    if (!strategy) {
      return NextResponse.json(
        { error: "AI provider did not return a strategy" },
        { status: 500 }
      );
    }

    // The original API returned an object with 'success', 'contract', 'audit'.
    // Our new interface returns a string (the strategy itself).
    // Adapt the response to match expectations if needed, or simply return the strategy.
    return NextResponse.json({ success: true, contract: strategy, audit: null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Strategy] Error:", msg);
    if (msg.includes("abort") || msg.includes("timeout")) {
      return NextResponse.json(
        { error: "AI provider is taking too long. Please try again." },
        { status: 504 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
