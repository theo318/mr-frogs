"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "../providers";
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SegmentCard,
} from "../_components/ui";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, bidding, runAuction, reset } = useFlow();

  useEffect(() => {
    if (!profile) router.replace("/");
  }, [profile, router]);

  if (!profile) return null;

  const handleAuction = async () => {
    router.push("/auction");
    void runAuction();
  };

  const handleReset = () => {
    reset();
    router.push("/");
  };

  return (
    <div>
      <PageHeader
        step={2}
        title="Your intent profile"
        hint="What the extraction agent thinks you're in the market for. Each segment has a sensitivity tier and a floor price — the minimum any advertiser must bid."
      />

      <div className="mb-5 rounded-lg border border-violet-500/30 bg-violet-500/5 p-4 text-sm text-zinc-200">
        {profile.summary}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {profile.top_categories.map((c) => (
          <span
            key={c}
            className="rounded-full border border-lime-400/40 bg-lime-400/5 px-2.5 py-1 text-[11px] uppercase tracking-wider text-lime-300"
          >
            {c}
          </span>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {profile.segments.map((seg) => (
          <SegmentCard key={seg.id} seg={seg} />
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <PrimaryButton onClick={handleAuction} disabled={bidding}>
          {bidding ? "Auction running…" : "Run advertiser auction →"}
        </PrimaryButton>
        <SecondaryButton onClick={handleReset}>Start over</SecondaryButton>
      </div>
    </div>
  );
}
