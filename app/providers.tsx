"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SAMPLE_THREADS } from "@/lib/sampleThreads";
import { ADVERTISERS } from "@/lib/advertisers";
import { checkPolicy, type ConsentRules, type PolicyDecision } from "@/lib/policy";
import type { Bid, IntentProfile, IntentSegment, SaleResult } from "@/lib/types";

export interface BidWithDecision {
  bid: Bid;
  segment: IntentSegment;
  decision: PolicyDecision;
  key: string; // `${advertiser}:${segment_id}`
}

interface FlowState {
  selected: string[];
  toggleThread: (id: string) => void;

  extracting: boolean;
  extractError: string | null;
  profile: IntentProfile | null;
  runExtract: () => Promise<boolean>;

  bidding: boolean;
  bids: Bid[];
  runAuction: () => Promise<void>;

  allowLow: boolean;
  setAllowLow: (v: boolean) => void;
  allowMedium: boolean;
  setAllowMedium: (v: boolean) => void;
  allowHigh: boolean;
  setAllowHigh: (v: boolean) => void;
  reserveUsd: number;
  setReserveUsd: (v: number) => void;

  passedBids: BidWithDecision[];
  flaggedBids: BidWithDecision[];
  stoppedBids: BidWithDecision[];

  approvedFlaggedKeys: Set<string>;
  approveFlagged: (key: string) => void;

  sale: SaleResult | null;
  approveSale: () => SaleResult | null;

  reset: () => void;
}

const FlowContext = createContext<FlowState | null>(null);

function bidKey(b: Bid): string {
  return `${b.advertiser}:${b.segment_id}`;
}

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>(SAMPLE_THREADS.map((t) => t.id));
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [profile, setProfile] = useState<IntentProfile | null>(null);
  const [bidding, setBidding] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);
  const [allowLow, setAllowLow] = useState(true);
  const [allowMedium, setAllowMedium] = useState(true);
  const [allowHigh, setAllowHigh] = useState(false);
  const [reserveUsd, setReserveUsd] = useState(0.01);
  const [sale, setSale] = useState<SaleResult | null>(null);
  const [approvedFlaggedKeys, setApprovedFlaggedKeys] = useState<Set<string>>(new Set());

  const toggleThread = useCallback(
    (id: string) =>
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    [],
  );

  const rules: ConsentRules = useMemo(
    () => ({
      allow_low: allowLow,
      allow_medium: allowMedium,
      allow_high: allowHigh,
      reserve_usd: reserveUsd,
    }),
    [allowLow, allowMedium, allowHigh, reserveUsd],
  );

  const { passedBids, flaggedBids, stoppedBids } = useMemo(() => {
    if (!profile) {
      return {
        passedBids: [] as BidWithDecision[],
        flaggedBids: [] as BidWithDecision[],
        stoppedBids: [] as BidWithDecision[],
      };
    }
    const segById = new Map(profile.segments.map((s) => [s.id, s]));
    const passed: BidWithDecision[] = [];
    const flagged: BidWithDecision[] = [];
    const stopped: BidWithDecision[] = [];
    for (const bid of bids) {
      const segment = segById.get(bid.segment_id);
      if (!segment) continue;
      const decision = checkPolicy(bid, segment, rules);
      const item: BidWithDecision = { bid, segment, decision, key: bidKey(bid) };
      if (decision.outcome === "pass") passed.push(item);
      else if (decision.outcome === "flag") flagged.push(item);
      else stopped.push(item);
    }
    passed.sort((a, b) => b.bid.bid_usd - a.bid.bid_usd);
    flagged.sort((a, b) => b.bid.bid_usd - a.bid.bid_usd);
    stopped.sort((a, b) => b.bid.bid_usd - a.bid.bid_usd);
    return { passedBids: passed, flaggedBids: flagged, stoppedBids: stopped };
  }, [bids, profile, rules]);

  const approveFlagged = useCallback((key: string) => {
    setApprovedFlaggedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const runExtract = useCallback(async () => {
    setExtracting(true);
    setExtractError(null);
    setProfile(null);
    setBids([]);
    setSale(null);
    setApprovedFlaggedKeys(new Set());
    try {
      const threads = SAMPLE_THREADS.filter((t) => selected.includes(t.id));
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threads }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Extraction failed");
      const { profile: p } = (await res.json()) as { profile: IntentProfile };
      setProfile(p);
      return true;
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Unknown error");
      return false;
    } finally {
      setExtracting(false);
    }
  }, [selected]);

  const runAuction = useCallback(async () => {
    if (!profile) return;
    setBidding(true);
    setBids([]);
    setSale(null);
    setApprovedFlaggedKeys(new Set());

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

    for (const t of tasks) {
      t.then((b) => {
        if (b) setBids((cur) => [...cur, b]);
      });
    }
    await Promise.allSettled(tasks);

    // Aggregator economics: Thrad syndicates across the downstream network,
    // so its bid sits above the highest direct advertiser. Bump after all
    // bids settle.
    setBids((cur) => {
      const isThrad = (b: Bid) => b.advertiser.toLowerCase() === "thrad";
      const otherMax = cur
        .filter((b) => !isThrad(b))
        .reduce((m, b) => Math.max(m, b.bid_usd), 0);
      if (otherMax <= 0) return cur;
      const floor = Math.round((otherMax + 0.005) * 1000) / 1000;
      return cur.map((b) =>
        isThrad(b) && b.bid_usd < floor ? { ...b, bid_usd: floor } : b,
      );
    });

    setBidding(false);
  }, [profile]);

  const approveSale = useCallback(() => {
    if (!profile) return null;
    // Union of passed bids and the flagged bids the user explicitly approved.
    const sellable = [
      ...passedBids,
      ...flaggedBids.filter((f) => approvedFlaggedKeys.has(f.key)),
    ].sort((a, b) => b.bid.bid_usd - a.bid.bid_usd);
    if (sellable.length === 0) return null;
    const winner = sellable[0].bid;
    const result: SaleResult = {
      segment_id: winner.segment_id,
      advertiser: winner.advertiser,
      price_usd: winner.bid_usd,
      ad_creative_hook: winner.ad_creative_hook,
      timestamp: new Date().toISOString(),
    };
    setSale(result);
    return result;
  }, [profile, passedBids, flaggedBids, approvedFlaggedKeys]);

  const reset = useCallback(() => {
    setProfile(null);
    setBids([]);
    setSale(null);
    setExtractError(null);
    setApprovedFlaggedKeys(new Set());
  }, []);

  const value: FlowState = {
    selected,
    toggleThread,
    extracting,
    extractError,
    profile,
    runExtract,
    bidding,
    bids,
    runAuction,
    allowLow,
    setAllowLow,
    allowMedium,
    setAllowMedium,
    allowHigh,
    setAllowHigh,
    reserveUsd,
    setReserveUsd,
    passedBids,
    flaggedBids,
    stoppedBids,
    approvedFlaggedKeys,
    approveFlagged,
    sale,
    approveSale,
    reset,
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used inside <FlowProvider>");
  return ctx;
}
