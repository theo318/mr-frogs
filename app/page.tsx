"use client";

import { useRouter } from "next/navigation";
import { SAMPLE_THREADS } from "@/lib/sampleThreads";
import { useFlow } from "./providers";
import { PageHeader, PrimaryButton } from "./_components/ui";

export default function ThreadsPage() {
  const router = useRouter();
  const {
    selected,
    toggleThread,
    extracting,
    extractError,
    runExtract,
  } = useFlow();

  const handleExtract = () => {
    void runExtract();
    router.push("/profile");
  };

  return (
    <div>
      <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          step={1}
          title="Pick threads to monetise"
          hint="Thrad lets advertisers bid on your attention inside chat. Right now, you're the inventory — not a party to the auction. Mr Frogs flips it: you sell your own data, advertisers bid, and Overmind ensures you stay in control. Personal threads only — never your work or client data."
        />
        <div
          className="frog-hero pointer-events-none select-none text-[140px] leading-none drop-shadow-[0_0_45px_rgba(163,230,53,0.6)] sm:text-[180px]"
          aria-hidden
        >
          🐸
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {SAMPLE_THREADS.map((t) => {
          const on = selected.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggleThread(t.id)}
              className={`rounded-lg border p-4 text-left transition ${
                on
                  ? "border-lime-400 bg-lime-400/5"
                  : "border-zinc-800 bg-zinc-950 hover:border-violet-500/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium">{t.title}</div>
                <div
                  className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
                    on ? "border-lime-400 bg-lime-400" : "border-zinc-600"
                  }`}
                />
              </div>
              <div className="mt-2 text-xs text-zinc-400">{t.excerpt}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <PrimaryButton onClick={handleExtract} disabled={extracting || selected.length === 0}>
          {extracting ? "Extracting intent…" : "Extract intent profile →"}
        </PrimaryButton>
        <span className="text-xs text-zinc-500">
          {selected.length} thread{selected.length === 1 ? "" : "s"} selected
        </span>
      </div>
      {extractError && (
        <p className="mt-3 text-sm text-fuchsia-400">{extractError}</p>
      )}
    </div>
  );
}
