"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SAMPLE_THREADS } from "@/lib/sampleThreads";
import { ADVERTISERS } from "@/lib/advertisers";
import type { Bid, IntentProfile, SaleResult, Sensitivity } from "@/lib/types";

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

  allowsSensitivity: (s: Sensitivity) => boolean;
  eligibleBids: Bid[];
  blockedBids: Bid[];

  sale: SaleResult | null;
  approveSale: () => SaleResult | null;

  reset: () => void;
}

const FlowContext = createContext<FlowState | null>(null);

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
  const [reserveUsd, setReserveUsd] = useState(0.1);
  const [sale, setSale] = useState<SaleResult | null>(null);

  const toggleThread = useCallback(
    (id: string) =>
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    [],
  );

  const allowsSensitivity = useCallback(
    (s: Sensitivity) =>
      (s === "low" && allowLow) ||
      (s === "medium" && allowMedium) ||
      (s === "high" && allowHigh),
    [allowLow, allowMedium, allowHigh],
  );

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
  }, [bids, profile, allowsSensitivity, reserveUsd]);

  const blockedBids = useMemo(() => {
    if (!profile) return [];
    const segById = new Map(profile.segments.map((s) => [s.id, s]));
    return bids.filter((b) => {
      const seg = segById.get(b.segment_id);
      if (!seg) return false;
      return !allowsSensitivity(seg.sensitivity) || b.bid_usd < reserveUsd;
    });
  }, [bids, profile, allowsSensitivity, reserveUsd]);

  const runExtract = useCallback(async () => {
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
    setBidding(false);
  }, [profile]);

  const approveSale = useCallback(() => {
    if (eligibleBids.length === 0 || !profile) return null;
    const winner = eligibleBids[0];
    const result: SaleResult = {
      segment_id: winner.segment_id,
      advertiser: winner.advertiser,
      price_usd: winner.bid_usd,
      ad_creative_hook: winner.ad_creative_hook,
      timestamp: new Date().toISOString(),
    };
    setSale(result);
    return result;
  }, [eligibleBids, profile]);

  const reset = useCallback(() => {
    setProfile(null);
    setBids([]);
    setSale(null);
    setExtractError(null);
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
    allowsSensitivity,
    eligibleBids,
    blockedBids,
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
