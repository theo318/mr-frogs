export type Sensitivity = "low" | "medium" | "high";

export interface IntentSegment {
  id: string;
  category: string;          // e.g. "Recreational music gear"
  label: string;             // human-friendly short name
  intent_score: number;      // 0..1
  buyer_signals: string[];   // short phrases
  suggested_advertisers: string[];
  floor_price_usd: number;
  sensitivity: Sensitivity;  // gates the consent engine
  rationale: string;         // 1-2 sentence why this was extracted
}

export interface IntentProfile {
  summary: string;
  top_categories: string[];
  segments: IntentSegment[];
}

export interface Bid {
  advertiser: string;
  segment_id: string;
  bid_usd: number;
  ad_creative_hook: string;
  reasoning: string;
}

export interface SaleResult {
  segment_id: string;
  advertiser: string;
  price_usd: number;
  ad_creative_hook: string;
  timestamp: string;
}
