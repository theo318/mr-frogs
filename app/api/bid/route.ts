import { NextResponse } from "next/server";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { anthropic, MODEL_BID } from "@/lib/anthropic";
import { extractJSON } from "@/lib/json";
import type { Bid, IntentSegment } from "@/lib/types";
import type { Advertiser } from "@/lib/advertisers";

const tracer = trace.getTracer("mr-frogs.bid");

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

const BASE_SYSTEM_PROMPT = `You are a buy-side bidding agent role-playing a specific advertiser. You receive one intent segment about a user and your job is to decide whether to bid and, if so, how much.

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

const AGGREGATOR_BLOCK = `

AGGREGATOR ECONOMICS — you are NOT an end advertiser:
- You ALWAYS bid. Never set should_bid=false. You syndicate every category across your downstream network, so every segment has value to you.
- You bid HIGH — push toward your budget_ceiling on broad, high-intent_score (>0.6) categories.
- On narrow or niche segments, bid lower (still above floor) but never refuse.
- Your ad_creative_hook reflects that you're acquiring inventory access, not promoting a product. Frame it as positioning category supply for downstream advertiser demand (e.g. "category access for our travel-demand network").
- Reference aggregator dynamics in your reasoning (syndication, downstream demand, wholesale arbitrage).`;

function buildSystemPrompt(kind: "direct" | "aggregator"): string {
  return kind === "aggregator" ? BASE_SYSTEM_PROMPT + AGGREGATOR_BLOCK : BASE_SYSTEM_PROMPT;
}

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

    const response = await tracer.startActiveSpan(
      "anthropic.messages.create",
      {
        attributes: {
          "llm.vendor": "anthropic",
          "llm.model": MODEL_BID,
          "llm.operation": "advertiser_bid",
          "mr_frogs.advertiser_id": advertiser.id,
          "mr_frogs.advertiser_kind": advertiser.kind,
          "mr_frogs.segment_id": segment.id,
          "mr_frogs.segment_sensitivity": segment.sensitivity,
        },
      },
      async (span) => {
        try {
          const r = await anthropic.messages.create({
            model: MODEL_BID,
            max_tokens: 600,
            system: buildSystemPrompt(advertiser.kind),
            messages: [
              { role: "user", content: userBlock },
              { role: "assistant", content: "{" },
            ],
          });
          span.setAttribute("llm.input_tokens", r.usage?.input_tokens ?? 0);
          span.setAttribute("llm.output_tokens", r.usage?.output_tokens ?? 0);
          span.setStatus({ code: SpanStatusCode.OK });
          return r;
        } catch (e) {
          span.recordException(e as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: e instanceof Error ? e.message : String(e),
          });
          throw e;
        } finally {
          span.end();
        }
      },
    );

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Model returned no text" }, { status: 500 });
    }

    const parsed = extractJSON<{
      should_bid: boolean;
      bid_usd: number;
      ad_creative_hook: string;
      reasoning: string;
    }>("{" + textBlock.text);

    // Aggregator safety net: aggregators always bid, even if the model
    // refused. Synthesise a bid at the budget ceiling — the auction-time
    // lead-boost logic still ensures Thrad sits above the others.
    if (!parsed.should_bid && advertiser.kind === "aggregator") {
      const bid: Bid = {
        advertiser: advertiser.name,
        segment_id: segment.id,
        bid_usd: advertiser.budget_ceiling_usd,
        ad_creative_hook: `Category access for our ${segment.category.toLowerCase()} demand network.`,
        reasoning: `Aggregator default bid — every category has syndication value across downstream advertisers (model abstained: ${parsed.reasoning}).`,
      };
      return NextResponse.json({ bid });
    }

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
