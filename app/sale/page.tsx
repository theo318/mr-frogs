"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "../providers";
import { PageHeader, PrimaryButton, SecondaryButton } from "../_components/ui";

export default function SalePage() {
  const router = useRouter();
  const { sale, reset } = useFlow();

  useEffect(() => {
    if (!sale) router.replace("/");
  }, [sale, router]);

  if (!sale) return null;

  const handleAgain = () => {
    reset();
    router.push("/");
  };

  return (
    <div>
      <PageHeader
        step={4}
        title="Sale confirmed"
        hint="Settled. You approved this — not the platform."
      />

      <div className="rounded-lg border border-lime-400/50 bg-lime-400/5 p-6">
        <div className="text-xs uppercase tracking-widest text-lime-300">Sold</div>
        <div className="mt-2 font-mono text-4xl text-lime-300">
          ${sale.price_usd.toFixed(2)}
        </div>
        <div className="mt-3 text-sm text-zinc-300">
          <span className="font-mono text-violet-300">{sale.advertiser}</span>
          <span className="mx-2 text-zinc-500">→</span>
          <span className="text-zinc-400">segment</span>{" "}
          <span className="font-mono text-violet-300">{sale.segment_id}</span>
        </div>
        <div className="mt-5 rounded-md border border-violet-500/30 bg-zinc-950 p-4 text-sm italic text-zinc-200">
          &ldquo;{sale.ad_creative_hook}&rdquo;
        </div>
        <div className="mt-4 text-xs text-zinc-500">
          {new Date(sale.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <PrimaryButton onClick={handleAgain}>Run another auction →</PrimaryButton>
        <SecondaryButton onClick={() => router.push("/auction")}>
          ← Back to auction
        </SecondaryButton>
      </div>
    </div>
  );
}
