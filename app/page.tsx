"use client";

import { useMemo, useState } from "react";
import { SAMPLE_THREADS } from "@/lib/sampleThreads";
import { ADVERTISERS } from "@/lib/advertisers";
import type { Bid, IntentProfile, IntentSegment, SaleResult, Sensitivity } from "@/lib/types";

const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
  low: "Low — general commercial",
  medium: "Medium — career / finance",
  high: "High — sensitive (health, identity, beliefs)",
};

const SENSITIVITY_TONE: Record<Sensitivity, string> = {
  low: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  high: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

export default function Page() {
  // ---- thread selection ----
  const [selected, setSelected] = useState<string[]>(SAMPLE_THREADS.map((t) => t.id));
  const toggleThread = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // ---- extraction state ----
  const [extracting, setExtracting] = useState(false);
  const [profile, setProfile] = useState<IntentProfile | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  // ---- bidding state ----
  const [bidding, setBidding] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);

  // ---- consent state ----
  const [allowLow, setAllowLow] = useState(true);
  const [allowMedium, setAllowMedium] = useState(true);
  const [allowHigh, setAllowHigh] = useState(false);
  const [reserveUsd, setReserveUsd] = useState(2);

  // ---- sale state ----
  const [sale, setSale] = useState<SaleResult | null>(null);

  const allowsSensitivity = (s: Sensitivity): boolean =>
    (s === "low" && allowLow) || (s === "medium" && allowMedium) || (s === "high" && allowHigh);

  const eligibleBids = useMemo(() => {
    if (!profile) return [];
    const segById = new Map(profile.segments.map((s) => [s.id, s]));
    return bids
      .filter((b) => {
        const seg = segById.get(b.segment_id);
        if (!seg) return false;
        if (!allowsSensitivity(seg.sensitivity)) return false;
        if (b.bid_usd < reserveUsd) return false;
        return true;
      })
      .sort((a, b) => b.bid_usd - a.bid_usd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids, profile, allowLow, allowMedium, allowHigh, reserveUsd]);

  const blockedBids = useMemo(() => {
    if (!profile) return [];
    const segById = new Map(profile.segments.map((s) => [s.id, s]));
    return bids.filter((b) => {
      const seg = segById.get(b.segment_id);
      if (!seg) return false;
      return !allowsSensitivity(seg.sensitivity) || b.bid_usd < reserveUsd;
    });
  }, [bids, profile, allowLow, allowMedium, allowHigh, reserveUsd]);

  const runExtract = async () => {
    setExtracting(true);
    setExtractError(null);
    setProfile(null);
    setBids([]);
    setSale(null);
    try {
      const threads = SAMPLE_THREADS.filter((t) => selected.includes(t.id));
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threads }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Extraction failed");
      const { profile } = (await res.json()) as { profile: IntentProfile };
      setProfile(profile);
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setExtracting(false);
    }
  };

  const runAuction = async () => {
    if (!profile) return;
    setBidding(true);
    setBids([]);
    setSale(null);

    // Fan out: every advertiser bids on every segment in parallel.
    const tasks: Promise<Bid | null>[] = [];
    for (const advertiser of ADVERTISERS) {
      for (const segment of profile.segments) {
        tasks.push(
          fetch("/api/bid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ advertiser, segment }),
          })
            .then((r) => r.json())
            .then((j) => (j.bid as Bid | null) ?? null)
            .catch(() => null),
        );
      }
    }

    // Stream results in as they land.
    for (const t of tasks) {
      t.then((b) => {
        if (b) setBids((cur) => [...cur, b]);
      });
    }
    await Promise.allSettled(tasks);
    setBidding(false);
  };

  const approveSale = () => {
    if (eligibleBids.length === 0 || !profile) return;
    const winner = eligibleBids[0];
    setSale({
      segment_id: winner.segment_id,
      advertiser: winner.advertiser,
      price_usd: winner.bid_usd,
      ad_creative_hook: winner.ad_creative_hook,
      timestamp: new Date().toISOString(),
    });
  };

  const reset = () => {
    setProfile(null);
    setBids([]);
    setSale(null);
    setExtractError(null);
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* HEADER */}
      <header className="mb-10 border-b border-zinc-800 pb-6">
        <div className="text-xs uppercase tracking-widest text-zinc-500">Cursor × Thrad · London 2026</div>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Intent Exchange</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Thrad lets advertisers bid on your attention inside chat. Right now, you&apos;re the inventory — not a party
          to the auction. This flips it. Your Claude history becomes an asset you own, price, and approve.
        </p>
      </header>

      {/* STEP 1 — THREADS */}
      <Section index={1} title="Pick threads to monetise" hint="Personal threads only. Never your work or client data.">
        <div className="grid gap-3 sm:grid-cols-3">
          {SAMPLE_THREADS.map((t) => {
            const on = selected.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleThread(t.id)}
                className={`rounded-lg border p-4 text-left transition ${
                  on ? "border-zinc-300 bg-zinc-900" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{t.title}</div>
                  <div
                    className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
                      on ? "border-zinc-200 bg-zinc-200" : "border-zinc-600"
                    }`}
                  />
                </div>
                <div className="mt-2 text-xs text-zinc-400">{t.excerpt}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-5">
          <button
            onClick={runExtract}
            disabled={extracting || selected.length === 0}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {extracting ? "Extracting intent…" : "Extract intent profile"}
          </button>
          {profile && (
            <button onClick={reset} className="ml-2 rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500">
              Reset
            </button>
          )}
          {extractError && <p className="mt-3 text-sm text-rose-400">{extractError}</p>}
        </div>
      </Section>

      {/* STEP 2 — PROFILE */}
      {profile && (
        <Section index={2} title="Your intent profile" hint="What the extraction agent thinks you're in the market for.">
          <div className="mb-4 rounded-md border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-300">
            {profile.summary}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {profile.segments.map((seg) => (
              <SegmentCard key={seg.id} seg={seg} />
            ))}
          </div>
          <div className="mt-5">
            <button
              onClick={runAuction}
              disabled={bidding}
              className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bidding ? "Auction running…" : "Run advertiser auction"}
            </button>
          </div>
        </Section>
      )}

      {/* STEP 3 — CONSENT */}
      {profile && bids.length > 0 && (
        <Section index={3} title="Consent engine" hint="Only sales that pass your rules are eligible.">
          <div className="grid gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Allowed sensitivity tiers</div>
              <ConsentToggle label={SENSITIVITY_LABEL.low} on={allowLow} setOn={setAllowLow} tone="emerald" />
              <ConsentToggle label={SENSITIVITY_LABEL.medium} on={allowMedium} setOn={setAllowMedium} tone="amber" />
              <ConsentToggle label={SENSITIVITY_LABEL.high} on={allowHigh} setOn={setAllowHigh} tone="rose" />
            </div>
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Reserve price</div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={0.5}
                  value={reserveUsd}
                  onChange={(e) => setReserveUsd(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <div className="w-16 text-right font-mono text-sm">${reserveUsd.toFixed(2)}</div>
              </div>
              <div className="text-xs text-zinc-500">
                Bids below this won&apos;t complete even if the category is allowed.
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* STEP 4 — BIDS */}
      {profile && bids.length > 0 && (
        <Section
          index={4}
          title="Live bids"
          hint={`${eligibleBids.length} eligible · ${blockedBids.length} blocked by consent engine`}
        >
          <div className="space-y-2">
            {eligibleBids.map((b, i) => {
              const seg = profile.segments.find((s) => s.id === b.segment_id);
              return <BidRow key={`${b.advertiser}-${b.segment_id}-${i}`} bid={b} seg={seg} status="eligible" rank={i + 1} />;
            })}
            {blockedBids.map((b, i) => {
              const seg = profile.segments.find((s) => s.id === b.segment_id);
              return <BidRow key={`b-${b.advertiser}-${b.segment_id}-${i}`} bid={b} seg={seg} status="blocked" />;
            })}
          </div>
          {!sale && (
            <div className="mt-5">
              <button
                onClick={approveSale}
                disabled={eligibleBids.length === 0}
                className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Approve top eligible sale
              </button>
            </div>
          )}
        </Section>
      )}

      {/* STEP 5 — SALE */}
      {sale && (
        <Section index={5} title="Sale confirmed" hint="Settled. Receipt below.">
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-6">
            <div className="text-sm uppercase tracking-widest text-emerald-300">Sold</div>
            <div className="mt-2 text-2xl font-medium">${sale.price_usd.toFixed(2)}</div>
            <div className="mt-1 text-sm text-zinc-300">
              <span className="font-mono">{sale.advertiser}</span> → segment{" "}
              <span className="font-mono">{sale.segment_id}</span>
            </div>
            <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm italic text-zinc-300">
              &ldquo;{sale.ad_creative_hook}&rdquo;
            </div>
            <div className="mt-3 text-xs text-zinc-500">{new Date(sale.timestamp).toLocaleString()}</div>
          </div>
        </Section>
      )}

      <footer className="mt-16 border-t border-zinc-800 pt-6 text-xs text-zinc-600">
        Built for Cursor × Thrad London 2026. The user is the sell-side.
      </footer>
    </main>
  );
}

// ---------- subcomponents ----------

function Section({
  index,
  title,
  hint,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500">Step {index}</div>
          <h2 className="mt-1 text-lg font-medium">{title}</h2>
        </div>
        {hint && <div className="text-xs text-zinc-500">{hint}</div>}
      </div>
      {children}
    </section>
  );
}

function SegmentCard({ seg }: { seg: IntentSegment }) {
  const pct = Math.round(seg.intent_score * 100);
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{seg.label}</div>
          <div className="text-xs text-zinc-500">{seg.category}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${SENSITIVITY_TONE[seg.sensitivity]}`}>
          {seg.sensitivity}
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Intent</span>
          <span className="font-mono">{pct}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full bg-zinc-200" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-3 text-xs text-zinc-400">
        <span className="text-zinc-500">Floor:</span> <span className="font-mono">${seg.floor_price_usd.toFixed(2)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {seg.buyer_signals.slice(0, 4).map((s, i) => (
          <span key={i} className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
            {s}
          </span>
        ))}
      </div>
      <div className="mt-3 text-xs italic text-zinc-500">{seg.rationale}</div>
    </div>
  );
}

function ConsentToggle({
  label,
  on,
  setOn,
  tone,
}: {
  label: string;
  on: boolean;
  setOn: (v: boolean) => void;
  tone: "emerald" | "amber" | "rose";
}) {
  const dot =
    tone === "emerald" ? "bg-emerald-400" : tone === "amber" ? "bg-amber-400" : "bg-rose-400";
  return (
    <button
      onClick={() => setOn(!on)}
      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
        on ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-950 text-zinc-500"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${on ? dot : "bg-zinc-700"}`} />
        {label}
      </span>
      <span className="text-[11px] uppercase tracking-wider text-zinc-500">{on ? "on" : "off"}</span>
    </button>
  );
}

function BidRow({
  bid,
  seg,
  status,
  rank,
}: {
  bid: Bid;
  seg?: IntentSegment;
  status: "eligible" | "blocked";
  rank?: number;
}) {
  const isBlocked = status === "blocked";
  return (
    <div
      className={`flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between ${
        isBlocked ? "border-zinc-900 bg-zinc-950 opacity-50" : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {rank && <span className="font-mono text-xs text-zinc-500">#{rank}</span>}
          <span className="text-sm font-medium">{bid.advertiser}</span>
          <span className="text-xs text-zinc-500">→</span>
          <span className="text-xs text-zinc-400">{seg?.label ?? bid.segment_id}</span>
        </div>
        <div className="mt-1 text-xs italic text-zinc-400">&ldquo;{bid.ad_creative_hook}&rdquo;</div>
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-0.5">
        <div className="font-mono text-base">${bid.bid_usd.toFixed(2)}</div>
        <div className={`text-[10px] uppercase tracking-wider ${isBlocked ? "text-rose-400" : "text-emerald-400"}`}>
          {isBlocked ? "blocked" : "eligible"}
        </div>
      </div>
    </div>
  );
}
