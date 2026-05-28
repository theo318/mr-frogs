import { NextResponse } from "next/server";
import { anthropic, MODEL_EXTRACT } from "@/lib/anthropic";
import { extractJSON } from "@/lib/json";
import type { IntentProfile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://chatgpt.com",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const SYSTEM_PROMPT = `You are an intent extraction agent. Read the user's AI-assistant transcripts and emit a sellable intent profile.

Output ONLY this JSON object (no preamble, no fences):

{
  "summary": "1-2 sentence narrative of this person",
  "top_categories": ["short", "category", "names"],
  "segments": [
    {
      "id": "kebab-case-id",
      "category": "Broad commercial category",
      "label": "Short label",
      "intent_score": 0.0,
      "buyer_signals": ["specific phrases from the transcripts"],
      "suggested_advertisers": ["plausible brand types"],
      "floor_price_usd": 0.0,
      "sensitivity": "low" | "medium" | "high",
      "rationale": "1 sentence justification"
    }
  ]
}

RULES:
- 2-4 segments. Quality over quantity.
- intent_score 0.0-1.0. 0.7+ = imminent purchase; 0.3-0.6 = exploratory.
- floor_price_usd: realistic CPC. Min $0.10, max $0.80. Most $0.10-$0.40. Only premium B2B / postgrad / founder-pipeline can reach $0.60-$0.80.
- sensitivity:
    - "low" = general commercial (gear, software, courses, hobbies)
    - "medium" = professional / career / finance
    - "high" = health, mental state, relationships, politics — mark high even if lucrative
- Be conservative on sensitivity. When in doubt, mark higher.
- buyer_signals MUST be grounded in the transcripts. Do not invent.`;

export async function POST(req: Request) {
  try {
    const { threads } = (await req.json()) as { threads: { title: string; full_text: string }[] };
    if (!Array.isArray(threads) || threads.length === 0) {
      return NextResponse.json({ error: "No threads provided" }, { status: 400 });
    }

    const userBlock = threads
      .map((t, i) => `=== Thread ${i + 1}: ${t.title} ===\n${t.full_text}`)
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: MODEL_EXTRACT,
      max_tokens: 900,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        { role: "user", content: userBlock },
        { role: "assistant", content: "{" },
      ],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Model returned no text" }, { status: 500 });
    }

    const profile = extractJSON<IntentProfile>("{" + textBlock.text);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("extract error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
