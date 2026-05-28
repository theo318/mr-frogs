import { NextResponse } from "next/server";
import { anthropic, MODEL_BID } from "@/lib/anthropic";
import { extractJSON } from "@/lib/json";
import type { Bid, IntentSegment } from "@/lib/types";
import type { Advertiser } from "@/lib/advertisers";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a buy-side bidding agent role-playing a specific advertiser. You receive one intent segment about a user and your job is to decide whether to bid and, if so, how much.

Output ONLY this JSON object:

{
  "should_bid": true | false,
  "bid_usd": 0.0,
  "ad_creative_hook": "One sentence ad copy tailored to the segment",
  "reasoning": "1-2 sentence rationale for the bid amount and copy"
}

RULES:
- Only bid if the segment is genuinely relevant to your brand. If not, set should_bid=false, bid_usd=0.
- bid_usd MUST be at or above the segment's floor_price_usd, and at or below your budget_ceiling.
- Higher intent_score and tighter category fit should push bids higher within your range.
- ad_creative_hook should match your brand_voice and reference at least one specific buyer_signal.
- Be honest: if your brand has no business advertising into this segment, return should_bid=false. Don't reach.`;

export async function POST(req: Request) {
  try {
    const { advertiser, segment } = (await req.json()) as {
      advertiser: Advertiser;
      segment: IntentSegment;
    };

    if (!advertiser || !segment) {
      return NextResponse.json({ error: "advertiser and segment required" }, { status: 400 });
    }

    const userBlock = [
      "ADVERTISER:",
      JSON.stringify(advertiser, null, 2),
      "",
      "SEGMENT:",
      JSON.stringify(segment, null, 2),
    ].join("\n");

    const response = await anthropic.messages.create({
      model: MODEL_BID,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userBlock }],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Model returned no text" }, { status: 500 });
    }

    const parsed = extractJSON<{
      should_bid: boolean;
      bid_usd: number;
      ad_creative_hook: string;
      reasoning: string;
    }>(textBlock.text);

    if (!parsed.should_bid) {
      return NextResponse.json({ bid: null, reasoning: parsed.reasoning });
    }

    const bid: Bid = {
      advertiser: advertiser.name,
      segment_id: segment.id,
      bid_usd: parsed.bid_usd,
      ad_creative_hook: parsed.ad_creative_hook,
      reasoning: parsed.reasoning,
    };
    return NextResponse.json({ bid });
  } catch (err) {
    console.error("bid error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
