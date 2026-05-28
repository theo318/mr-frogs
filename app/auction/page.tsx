"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "../providers";
import {
  ConsentToggle,
  PageHeader,
  PolicyBidRow,
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
    passedBids,
    flaggedBids,
    stoppedBids,
    approvedFlaggedKeys,
    approveFlagged,
    approveSale,
  } = useFlow();

  useEffect(() => {
    if (!profile) router.replace("/");
  }, [profile, router]);

  if (!profile) return null;

  const sellableCount =
    passedBids.length +
    flaggedBids.filter((f) => approvedFlaggedKeys.has(f.key)).length;

  const handleApprove = () => {
    const result = approveSale();
    if (result) router.push("/sale");
  };

  return (
    <div>
      <PageHeader
        step={3}
        title="Consent engine + live bids"
        hint="Set what kinds of intent you'll sell and your reserve price. Every bid runs through the pass / flag / stop policy. You — not the platform — close the auction."
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
                max={0.1}
                step={0.005}
                value={reserveUsd}
                onChange={(e) => setReserveUsd(parseFloat(e.target.value))}
                className="flex-1"
              />
              <div className="w-24 text-right font-mono text-sm text-lime-300">
                ${reserveUsd.toFixed(3)}
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              Bids below this won&apos;t complete even if the category is allowed.
              All bids land between $0.01 and $0.10.
            </div>
          </div>
        </div>
      </section>

      {bids.length === 0 && !bidding && (
        <div className="rounded-md border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
          No bids yet.
        </div>
      )}

      <BucketSection
        title="Passed"
        count={passedBids.length}
        color="lime"
        hint="Auto-eligible. Highest bid wins on approval."
      >
        {passedBids.map((item, i) => (
          <PolicyBidRow
            key={item.key}
            advertiser={item.bid.advertiser}
            segmentLabel={item.segment.label}
            bidUsd={item.bid.bid_usd}
            hook={item.bid.ad_creative_hook}
            outcome="pass"
            triggeredRules={item.decision.triggered_rules}
            reason={item.decision.reason}
            rank={i + 1}
          />
        ))}
      </BucketSection>

      <BucketSection
        title="Flagged"
        count={flaggedBids.length}
        color="violet"
        hint="Sellable, but only after explicit approval."
      >
        {flaggedBids.map((item) => {
          const approved = approvedFlaggedKeys.has(item.key);
          return (
            <PolicyBidRow
              key={item.key}
              advertiser={item.bid.advertiser}
              segmentLabel={item.segment.label}
              bidUsd={item.bid.bid_usd}
              hook={item.bid.ad_creative_hook}
              outcome="flag"
              triggeredRules={item.decision.triggered_rules}
              reason={item.decision.reason}
              rightSlot={
                <button
                  onClick={() => approveFlagged(item.key)}
                  className={`mt-1 rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                    approved
                      ? "border-lime-400 bg-lime-400/10 text-lime-300"
                      : "border-violet-400/60 bg-violet-500/5 text-violet-200 hover:border-violet-300"
                  }`}
                >
                  {approved ? "Approved" : "Approve this"}
                </button>
              }
            />
          );
        })}
      </BucketSection>

      <BucketSection
        title="Stopped"
        count={stoppedBids.length}
        color="fuchsia"
        hint="Blocked by the policy engine. Visible so the rules are explainable."
      >
        {stoppedBids.map((item) => (
          <PolicyBidRow
            key={item.key}
            advertiser={item.bid.advertiser}
            segmentLabel={item.segment.label}
            bidUsd={item.bid.bid_usd}
            hook={item.bid.ad_creative_hook}
            outcome="stop"
            triggeredRules={item.decision.triggered_rules}
            reason={item.decision.reason}
          />
        ))}
      </BucketSection>

      <div className="mt-6 flex items-center gap-3">
        <PrimaryButton onClick={handleApprove} disabled={sellableCount === 0}>
          Approve top sale →
        </PrimaryButton>
        <SecondaryButton onClick={() => router.push("/profile")}>
          ← Back to profile
        </SecondaryButton>
        <span className="text-xs text-zinc-500">
          {sellableCount === 0
            ? "No sellable bids yet"
            : `${sellableCount} sellable (${passedBids.length} passed + ${
                sellableCount - passedBids.length
              } approved-flagged)`}
        </span>
      </div>
    </div>
  );
}

function BucketSection({
  title,
  count,
  color,
  hint,
  children,
}: {
  title: string;
  count: number;
  color: "lime" | "violet" | "fuchsia";
  hint: string;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  const tone =
    color === "lime"
      ? "text-lime-400"
      : color === "violet"
        ? "text-violet-400"
        : "text-fuchsia-400";
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className={`text-xs uppercase tracking-widest ${tone}`}>
          {title} <span className="font-mono">·{" "}{count}</span>
        </h2>
        <span className="text-xs text-zinc-500">{hint}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
