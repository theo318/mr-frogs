// Personal-only sample threads. Replace with your own exports.
// Critically, do NOT paste work / client / confidential threads here.

export interface SampleThread {
  id: string;
  title: string;
  excerpt: string;
  full_text: string;
}

const BASS = [
  "User: I play bass guitar and I've been trying to record demo tracks in GarageBand on my MacBook. Hitting weird latency when I monitor through my interface — Focusrite Scarlett Solo, line in from a P-bass.",
  "Claude: Latency in GarageBand usually comes down to buffer size...",
  "User: I think I want to upgrade my interface anyway. I've been eyeing the UA Volt 2 or maybe an Apollo. Is the Apollo overkill for someone recording bass demos at home?",
  "Claude: For bass demos alone, Apollo is overkill — but if you plan to record more instruments...",
  "User: Honestly I'd love to get into multi-tracking properly. Drums, bass, maybe vocals. I'm not gigging right now but I want a setup that grows with me.",
  "Claude: Then the Apollo Twin X duo is a sensible 5-year buy...",
  "User: What strings would you recommend for a P-bass if I want a fatter, more rounded tone? I've been on D'Addario flatwounds.",
].join("\n\n");

const HISTORY = [
  "User: I'm writing an undergraduate essay on LBJ and Vietnam. I want to argue that Johnson's domestic ambitions on the Great Society constrained his options on escalation. Is that defensible?",
  "Claude: Yes, that's a serious thesis. The scholarship splits roughly between...",
  "User: Can you recommend the strongest primary sources I should be citing?",
  "Claude: The Pentagon Papers obviously, but also the LBJ tape transcripts edited by Beschloss...",
  "User: I'm visiting the British Library next week — anything specific I should pull?",
  "Claude: Worth checking their holdings of the Foreign Relations of the United States series...",
  "User: I'd love to do a year of postgrad history. Thinking SOAS or UCL. Any thoughts on funding for UK postgrads?",
].join("\n\n");

const HACK = [
  "User: I'm prepping for a London hackathon this weekend, fintech theme. I want to build an invoice-finance risk agent. Stack ideas?",
  "Claude: For two days, keep the surface area small. LangGraph for orchestration, OpenAI or Anthropic for the LLM...",
  "User: I've been using Claude Code as my primary IDE lately and I really like it. Would Cursor be better for hackathons?",
  "Claude: They're complementary. Cursor wins on inline edits in a polished IDE, Claude Code on agentic multi-file tasks from the terminal...",
  "User: I'm based in London, would love recommendations for hackathon meetups beyond Briefcase and Cursor's events.",
  "Claude: Newcomer.io runs a weekly list...",
  "User: Eventually I'd like to co-found something. Probably an AI agent product — I keep thinking about agent-mediated marketplaces.",
].join("\n\n");

export const SAMPLE_THREADS: SampleThread[] = [
  {
    id: "bass",
    title: "Multi-track recording + bass gear",
    excerpt: "Latency in GarageBand, interface upgrades, P-bass strings...",
    full_text: BASS,
  },
  {
    id: "history",
    title: "LBJ / Vietnam essay + postgrad",
    excerpt: "Thesis on Great Society constraining escalation, postgrad funding...",
    full_text: HISTORY,
  },
  {
    id: "hack",
    title: "Hackathons, AI tooling, co-founding",
    excerpt: "London hackathons, Cursor vs Claude Code, agent marketplaces...",
    full_text: HACK,
  },
];
