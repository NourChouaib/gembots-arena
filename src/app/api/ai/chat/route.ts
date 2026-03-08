import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "../../../../lib/ai-provider";

export async function POST(req: NextRequest) {
  try {
    const provider = getProvider();

    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const answer = await provider.chat([{ role: "user", content: question }]);

    if (!answer) {
      return NextResponse.json({ error: "AI provider did not return an answer" }, { status: 500 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
