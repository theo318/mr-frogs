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
    id: "sweetwater",
    name: "Sweetwater",
    description: "US music gear retailer, sells instruments, audio interfaces, recording equipment",
    budget_ceiling_usd: 0.4,
    brand_voice: "expert-friendly, gear-nerdy, helpful sales engineer energy",
    kind: "direct",
  },
  {
    id: "masterclass",
    name: "MasterClass",
    description: "Subscription platform with celebrity-taught courses across creative fields and history",
    budget_ceiling_usd: 0.55,
    brand_voice: "aspirational, prestige, intellectual ambition",
    kind: "direct",
  },
  {
    id: "soas",
    name: "SOAS University of London",
    description: "Postgraduate institution specialising in regions, languages, history and politics",
    budget_ceiling_usd: 0.85,
    brand_voice: "rigorous, academic, internationalist",
    kind: "direct",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issue tracking and product management software popular with technical founders",
    budget_ceiling_usd: 0.7,
    brand_voice: "minimal, design-led, builder-to-builder",
    kind: "direct",
  },
  {
    id: "antler",
    name: "Antler",
    description: "Early-stage VC and pre-team founder programme that helps people start companies",
    budget_ceiling_usd: 0.95,
    brand_voice: "ambitious, action-oriented, community-driven",
    kind: "direct",
  },
  {
    id: "thrad",
    name: "Thrad",
    description:
      "AI ad infrastructure aggregator. Buys category-level supply across LLM channels to feed downstream advertiser demand. Acts as wholesale middleman, not end advertiser.",
    budget_ceiling_usd: 1.0,
    brand_voice: "infrastructure-aware, ecosystem-positioning, aggregator economics",
    kind: "aggregator",
  },
];
