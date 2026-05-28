# Intent Exchange

Built for **Cursor × Thrad · London 2026**.

> Thrad lets advertisers bid on your attention inside chat. Right now, you're
> the inventory — not a party to the auction. **Intent Exchange flips it.**
> Your Claude history becomes an asset you own, price, and approve.

## The inversion

OpenAI is putting ads in ChatGPT. Anthropic says "not in Claude." This is the
third position: ads, but the **user is the sell-side**. They consent. They
price. They approve.

## How it maps to the tracks

The project sits across both tracks because the inversion needs all three
pillars:

| Pillar | Implementation |
| --- | --- |
| **Measurement** (Track 02) | The extraction agent reads conversation transcripts and emits a structured intent profile — categories, intent scores 0–1, buyer signals grounded in the text, suggested floor prices, and a sensitivity tier. |
| **Buy-side** (Track 01) | Five advertiser personas (Sweetwater, MasterClass, SOAS, Linear, Antler) each role-play a bidding agent and place bids per segment against their budget ceiling and brand fit. |
| **Sell-side** (Track 02) | The user is the publisher of an audience-of-one. The profile is the inventory. |
| **Human-in-the-loop / brand safety** | The **consent engine** is the spine. Sensitivity tiers (low / medium / high) and a reserve price gate every bid. Only the user approves the sale. |

## Demo loop

1. Pick which conversation threads to monetise.
2. **Extract intent profile** → Claude Sonnet 4.6 produces a structured JSON profile with 3–6 segments.
3. **Run advertiser auction** → 5 advertiser personas × N segments fan out in parallel; Haiku 4.5 produces grounded bids and creative.
4. **Consent engine** → toggle sensitivity tiers, set reserve price. Ineligible bids visibly fail.
5. **Approve top eligible sale** → the user — not the platform — closes the auction.

## Bonus integrations

Picked one (the highest-leverage). Stretch goals noted:

- **Overmind (planned hot-swap of the consent engine)** — every "sell" action is the kind of in-flight policy check Overmind exists for: pass, flag for review, or stop cold. The current consent engine is intentionally written as a single filter function so it can be wrapped in an Overmind policy in one diff.
- **Tavily (stretch)** — enrich each segment with live advertiser/product context to improve floor pricing.
- **Alpic (stretch)** — host the intent profile behind an MCP endpoint so advertiser agents can query it live.

## Run it

```bash
cp .env.example .env.local
# add your ANTHROPIC_API_KEY
pnpm install   # or npm / yarn
pnpm dev
```

Open <http://localhost:3000>.

## Deploy

```bash
git init && git add . && git commit -m "init: intent exchange"
gh repo create intent-exchange --public --source=. --push
```

Then on Vercel: import the repo, set `ANTHROPIC_API_KEY`, deploy.

## Extension

The Next.js app is the **dashboard / fallback** — a standalone walk-through of
the demo loop at `localhost:3000`. The real surface is a Chrome MV3 extension
that lives on `chatgpt.com` and acts as the **native UX layer for the intent
exchange**: a Shadow-DOM sidebar that captures user prompts, calls the same
backend, and renders the auction inline next to ChatGPT.

See [`extension/README.md`](extension/README.md) for load-unpacked steps and
the `BACKEND_URL` swap for Vercel deploys. The extension never talks to
Anthropic directly — all model work goes through `/api/extract`, `/api/bid`,
and `/api/advertisers` on the Next.js backend.

## Architecture

```
app/
  page.tsx              client UI — threads picker
  profile/page.tsx      extracted intent profile
  auction/page.tsx      consent engine + live bids
  sale/page.tsx         receipt
  providers.tsx         FlowProvider context across routes
  api/
    extract/route.ts    POST conversations → IntentProfile (Haiku 4.5)
    bid/route.ts        POST {advertiser, segment} → Bid (Haiku 4.5)
    advertisers/route.ts  GET advertiser list (for the extension)
lib/
  types.ts              IntentProfile / IntentSegment / Bid / SaleResult
  sampleThreads.ts      personal-only seed threads
  advertisers.ts        6 advertiser personas (5 direct + Thrad aggregator)
  anthropic.ts          SDK client + model constants
  json.ts               tolerant JSON extractor
extension/
  manifest.json         Chrome MV3 manifest
  content.js            Shadow-DOM sidebar + ChatGPT prompt observer
  sidebar.css           dark zinc palette
```

No DB. No auth. Everything in memory for the duration of the demo, which is
exactly the right scope for a 2-hour build. The submission form asks for a
GitHub URL and a Demo URL — Vercel covers both.

## Safety notes

- The sample threads are deliberately **personal** (music, history, hackathons). Never put work, client, or confidential conversations through the extractor — this is the point of the consent layer, and it's also a real-world data-protection consideration.
- The extraction prompt is told to be **conservative on sensitivity** — health, mental state, relationships, politics get tagged `high` and are off by default in the consent engine.
- Sale finality is intentionally a user-approval click, not an auto-fire.

## What this is not

A real ad exchange. The bids are LLM role-plays. The "settlement" is an
in-memory state update. The point is the **shape** of the auction with the
user actually inside it, not a production exchange.
