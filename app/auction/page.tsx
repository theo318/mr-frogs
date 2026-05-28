"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "../providers";
import {
  BidRow,
  ConsentToggle,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SENSITIVITY_LABEL,
} from "../_components/ui";

export default function AuctionPage() {
  const router = useRouter();
  const {
    profile,
    bids,
    bidding,
    allowLow,
    setAllowLow,
    allowMedium,
    setAllowMedium,
    allowHigh,
    setAllowHigh,
    reserveUsd,
    setReserveUsd,
    eligibleBids,
    blockedBids,
    approveSale,
  } = useFlow();

  useEffect(() => {
    if (!profile) router.replace("/");
  }, [profile, router]);

  if (!profile) return null;

  const handleApprove = () => {
    const result = approveSale();
    if (result) router.push("/sale");
  };

  return (
    <div>
      <PageHeader
        step={3}
        title="Consent engine + live bids"
        hint="Set what kinds of intent you'll sell and your reserve price. Only bids that pass both your rules are eligible. You — not the platform — close the auction."
      />

      <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-violet-400">
              Allowed sensitivity tiers
            </div>
            <ConsentToggle
              label={SENSITIVITY_LABEL.low}
              on={allowLow}
              setOn={setAllowLow}
              tone="lime"
            />
            <ConsentToggle
              label={SENSITIVITY_LABEL.medium}
              on={allowMedium}
              setOn={setAllowMedium}
              tone="violet"
            />
            <ConsentToggle
              label={SENSITIVITY_LABEL.high}
              on={allowHigh}
              setOn={setAllowHigh}
              tone="fuchsia"
            />
          </div>
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-violet-400">
              Reserve price
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={reserveUsd}
                onChange={(e) => setReserveUsd(parseFloat(e.target.value))}
                className="flex-1"
              />
              <div className="w-20 text-right font-mono text-sm text-lime-300">
                ${reserveUsd.toFixed(2)}
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              Bids below this won&apos;t complete even if the category is allowed.
              All bids land between $0.10 and $1.00.
            </div>
          </div>
        </div>
      </section>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Live bids</h2>
        <div className="text-xs text-zinc-500">
          <span className="text-lime-400">{eligibleBids.length} eligible</span> ·{" "}
          <span className="text-fuchsia-400">{blockedBids.length} blocked</span>
          {bidding && (
            <span className="ml-2 text-violet-300">· bidding…</span>
          )}
        </div>
      </div>

      {bids.length === 0 && !bidding && (
        <div className="rounded-md border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
          No bids yet.
        </div>
      )}

      <div className="space-y-2">
        {eligibleBids.map((b, i) => {
          const seg = profile.segments.find((s) => s.id === b.segment_id);
          return (
            <BidRow
              key={`e-${b.advertiser}-${b.segment_id}-${i}`}
              bid={b}
              seg={seg}
              status="eligible"
              rank={i + 1}
            />
          );
        })}
        {blockedBids.map((b, i) => {
          const seg = profile.segments.find((s) => s.id === b.segment_id);
          return (
            <BidRow
              key={`b-${b.advertiser}-${b.segment_id}-${i}`}
              bid={b}
              seg={seg}
              status="blocked"
            />
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <PrimaryButton onClick={handleApprove} disabled={eligibleBids.length === 0}>
          Approve top eligible sale →
        </PrimaryButton>
        <SecondaryButton onClick={() => router.push("/profile")}>
          ← Back to profile
        </SecondaryButton>
      </div>
    </div>
  );
}
