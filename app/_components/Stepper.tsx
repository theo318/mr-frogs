"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFlow } from "../providers";

const STEPS = [
  { href: "/", label: "Threads", index: 1 },
  { href: "/profile", label: "Profile", index: 2 },
  { href: "/auction", label: "Auction", index: 3 },
  { href: "/sale", label: "Sale", index: 4 },
];

export function Stepper() {
  const pathname = usePathname();
  const { profile, extracting, bids, sale } = useFlow();

  const reachable = (href: string) => {
    if (href === "/") return true;
    if (href === "/profile") return !!profile || extracting;
    if (href === "/auction") return !!profile;
    if (href === "/sale") return !!sale || bids.length > 0;
    return false;
  };

  return (
    <nav className="mb-8 flex items-center gap-2 overflow-x-auto">
      {STEPS.map((step, i) => {
        const active = pathname === step.href;
        const allowed = reachable(step.href);
        const base =
          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition";
        const cls = active
          ? "border-lime-400 bg-lime-400/10 text-lime-300"
          : allowed
            ? "border-violet-500/40 bg-violet-500/5 text-violet-300 hover:border-violet-400"
            : "border-zinc-800 bg-zinc-950 text-zinc-600 cursor-not-allowed";
        const dot = active
          ? "bg-lime-400"
          : allowed
            ? "bg-violet-400"
            : "bg-zinc-700";

        return (
          <div key={step.href} className="flex items-center gap-2">
            {allowed ? (
              <Link href={step.href} className={`${base} ${cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <span className="font-mono">{step.index}</span>
                <span>{step.label}</span>
              </Link>
            ) : (
              <span className={`${base} ${cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <span className="font-mono">{step.index}</span>
                <span>{step.label}</span>
              </span>
            )}
            {i < STEPS.length - 1 && (
              <span className="text-zinc-700">→</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
