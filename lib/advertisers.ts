export interface Advertiser {
  id: string;
  name: string;
  description: string;
  budget_ceiling_usd: number;
  brand_voice: string;
}

export const ADVERTISERS: Advertiser[] = [
  {
    id: "sweetwater",
    name: "Sweetwater",
    description: "US music gear retailer, sells instruments, audio interfaces, recording equipment",
    budget_ceiling_usd: 18,
    brand_voice: "expert-friendly, gear-nerdy, helpful sales engineer energy",
  },
  {
    id: "masterclass",
    name: "MasterClass",
    description: "Subscription platform with celebrity-taught courses across creative fields and history",
    budget_ceiling_usd: 22,
    brand_voice: "aspirational, prestige, intellectual ambition",
  },
  {
    id: "soas",
    name: "SOAS University of London",
    description: "Postgraduate institution specialising in regions, languages, history and politics",
    budget_ceiling_usd: 35,
    brand_voice: "rigorous, academic, internationalist",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issue tracking and product management software popular with technical founders",
    budget_ceiling_usd: 28,
    brand_voice: "minimal, design-led, builder-to-builder",
  },
  {
    id: "antler",
    name: "Antler",
    description: "Early-stage VC and pre-team founder programme that helps people start companies",
    budget_ceiling_usd: 45,
    brand_voice: "ambitious, action-oriented, community-driven",
  },
];
