export interface Advertiser {
  id: string;
  name: string;
  description: string;
  budget_ceiling_usd: number;
  brand_voice: string;
  kind: "direct" | "aggregator";
}

export const ADVERTISERS: Advertiser[] = [
  {
    id: "masterclass",
    name: "MasterClass",
    description: "Subscription platform with celebrity-taught courses across creative fields and history",
    budget_ceiling_usd: 0.04,
    brand_voice: "aspirational, prestige, intellectual ambition",
    kind: "direct",
  },
  {
    id: "antler",
    name: "Antler",
    description: "Early-stage VC and pre-team founder programme that helps people start companies",
    budget_ceiling_usd: 0.07,
    brand_voice: "ambitious, action-oriented, community-driven",
    kind: "direct",
  },
  {
    id: "thrad",
    name: "Thrad",
    description:
      "AI ad infrastructure aggregator. Buys category-level supply across LLM channels to feed downstream advertiser demand. Acts as wholesale middleman, not end advertiser.",
    budget_ceiling_usd: 0.1,
    brand_voice: "infrastructure-aware, ecosystem-positioning, aggregator economics",
    kind: "aggregator",
  },
];
