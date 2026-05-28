import { NextResponse } from "next/server";
import { anthropic, MODEL_EXTRACT } from "@/lib/anthropic";
import { extractJSON } from "@/lib/json";
import type { IntentProfile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an intent extraction agent for a personal intent exchange. The user has supplied transcripts of their own conversations with an AI assistant. Your job is to read them and produce a structured, sellable intent profile.

You output ONLY a single JSON object with this exact shape:

{
  "summary": "2-3 sentence narrative of who this person seems to be",
  "top_categories": ["short", "category", "names"],
  "segments": [
    {
      "id": "kebab-case-id",
      "category": "Broad commercial category",
      "label": "Short human-friendly label",
      "intent_score": 0.0,
      "buyer_signals": ["specific phrases or behaviours from the transcripts"],
      "suggested_advertisers": ["plausible brand types"],
      "floor_price_usd": 0.0,
      "sensitivity": "low" | "medium" | "high",
      "rationale": "1-2 sentence justification grounded in the transcripts"
    }
  ]
}

RULES:
- Produce 3-6 segments. Quality over quantity.
- intent_score: 0.0-1.0. 0.7+ means imminent purchase intent; 0.3-0.6 = exploratory; below 0.3 = weak/passing mention.
- floor_price_usd: a realistic CPC-equivalent price for this segment. STRICT RANGE: minimum $0.10, maximum $0.80. Most consumer/hobby intent should sit in $0.10-$0.40. Only top-tier B2B / postgrad / founder-pipeline categories should approach $0.60-$0.80. Never exceed $0.80. Be conservative — pennies are normal.
- sensitivity:
    - "low" = generic commercial interest (gear, software, courses, hobbies)
    - "medium" = professional / career / financial decisions
    - "high" = health, mental state, relationships, politics, anything the user might prefer not to sell. Even if the segment looks lucrative, mark it high.
- Be conservative on sensitivity. When in doubt, mark higher.
- buyer_signals must be grounded in the transcripts. Do not invent.
- Output ONLY the JSON object. No preamble, no markdown fences.`;

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
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
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
