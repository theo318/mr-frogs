"use client";

import type { Bid, IntentSegment, Sensitivity } from "@/lib/types";
import type { PolicyOutcome } from "@/lib/policy";

export const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
  low: "Low — general commercial",
  medium: "Medium — career / finance",
  high: "High — sensitive (health, identity, beliefs)",
};

export const SENSITIVITY_TONE: Record<Sensitivity, string> = {
  low: "bg-lime-400/10 text-lime-300 border-lime-400/30",
  medium: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  high: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/40",
};

export function PageHeader({
  step,
  title,
  hint,
}: {
  step: number;
  title: string;
  hint?: string;
}) {
  return (
    <header className="mb-8 border-b border-zinc-800 pb-6">
      <div className="text-xs uppercase tracking-widest text-violet-400">Step {step}</div>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">{title}</h1>
      {hint && <p className="mt-3 max-w-2xl text-sm text-zinc-400">{hint}</p>}
    </header>
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "rounded-md bg-lime-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40 " +
        (props.className ?? "")
      }
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "rounded-md border border-violet-500/50 bg-violet-500/5 px-4 py-2 text-sm text-violet-200 transition hover:border-violet-400 hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-40 " +
        (props.className ?? "")
      }
    >
      {children}
    </button>
  );
}

export function SegmentCard({ seg }: { seg: IntentSegment }) {
  const pct = Math.round(seg.intent_score * 100);
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{seg.label}</div>
          <div className="text-xs text-zinc-500">{seg.category}</div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${SENSITIVITY_TONE[seg.sensitivity]}`}
        >
          {seg.sensitivity}
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Intent</span>
          <span className="font-mono">{pct}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full bg-lime-400" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-3 text-xs text-zinc-400">
        <span className="text-zinc-500">Floor:</span>{" "}
        <span className="font-mono text-lime-300">${seg.floor_price_usd.toFixed(2)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {seg.buyer_signals.slice(0, 4).map((s, i) => (
          <span
            key={i}
            className="rounded-md border border-violet-500/20 bg-violet-500/5 px-2 py-0.5 text-[11px] text-violet-200"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-3 text-xs italic text-zinc-500">{seg.rationale}</div>
    </div>
  );
}

export function ConsentToggle({
  label,
  on,
  setOn,
  tone,
}: {
  label: string;
  on: boolean;
  setOn: (v: boolean) => void;
  tone: "lime" | "violet" | "fuchsia";
}) {
  const dot =
    tone === "lime" ? "bg-lime-400" : tone === "violet" ? "bg-violet-400" : "bg-fuchsia-400";
  return (
    <button
      onClick={() => setOn(!on)}
      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
        on
          ? "border-zinc-700 bg-zinc-900"
          : "border-zinc-800 bg-zinc-950 text-zinc-500"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${on ? dot : "bg-zinc-700"}`} />
        {label}
      </span>
      <span className="text-[11px] uppercase tracking-wider text-zinc-500">
        {on ? "on" : "off"}
      </span>
    </button>
  );
}

const OUTCOME_STYLES: Record<
  PolicyOutcome,
  { container: string; amount: string; status: string; label: string }
> = {
  pass: {
    container: "border-lime-400/30 bg-lime-400/5",
    amount: "text-lime-300",
    status: "text-lime-400",
    label: "passed",
  },
  flag: {
    container: "border-violet-500/40 bg-violet-500/5",
    amount: "text-violet-200",
    status: "text-violet-300",
    label: "flagged",
  },
  stop: {
    container: "border-fuchsia-500/30 bg-zinc-950 opacity-60",
    amount: "text-zinc-500",
    status: "text-fuchsia-400",
    label: "stopped",
  },
};

export function PolicyBidRow({
  advertiser,
  segmentLabel,
  bidUsd,
  hook,
  outcome,
  triggeredRules,
  reason,
  rank,
  rightSlot,
}: {
  advertiser: string;
  segmentLabel: string;
  bidUsd: number;
  hook: string;
  outcome: PolicyOutcome;
  triggeredRules: string[];
  reason: string;
  rank?: number;
  rightSlot?: React.ReactNode;
}) {
  const s = OUTCOME_STYLES[outcome];
  const ruleSuffix = triggeredRules.length > 0 ? `: ${triggeredRules.join(", ")}` : "";
  return (
    <div
      className={`flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between ${s.container}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {rank && <span className="font-mono text-xs text-violet-400">#{rank}</span>}
          <span className="text-sm font-medium">{advertiser}</span>
          <span className="text-xs text-zinc-500">→</span>
          <span className="text-xs text-zinc-400">{segmentLabel}</span>
        </div>
        <div className="mt-1 text-xs italic text-zinc-400">&ldquo;{hook}&rdquo;</div>
        {outcome !== "pass" && (
          <div className="mt-1 font-mono text-[11px] text-zinc-500">
            {s.label}
            {ruleSuffix} — <span className="not-italic">{reason}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
        <div className={`font-mono text-base ${s.amount}`}>${bidUsd.toFixed(2)}</div>
        <div className={`text-[10px] uppercase tracking-wider ${s.status}`}>{s.label}</div>
        {rightSlot}
      </div>
    </div>
  );
}
