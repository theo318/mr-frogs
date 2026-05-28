import type { Metadata } from "next";
import "./globals.css";
import { FlowProvider } from "./providers";
import { Stepper } from "./_components/Stepper";

export const metadata: Metadata = {
  title: "Intent Exchange 🐸",
  description: "You sell your own data. Advertisers bid. You approve.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {/* ambient color wash */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-lime-400/15 blur-3xl" />
          <div className="absolute -bottom-40 -right-24 h-[520px] w-[520px] rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute top-1/3 left-1/2 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>

        <FlowProvider>
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="frog-mascot text-5xl leading-none drop-shadow-[0_0_24px_rgba(163,230,53,0.55)]"
                  aria-hidden
                >
                  🐸
                </span>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-violet-400">
                    Cursor <span className="text-lime-400">×</span> Thrad · London 2026
                  </div>
                  <div className="text-base font-semibold tracking-tight">
                    <span className="bg-gradient-to-r from-lime-300 via-lime-400 to-emerald-400 bg-clip-text text-transparent">
                      Intent
                    </span>
                    <span className="bg-gradient-to-r from-violet-300 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                      {" "}Exchange
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden text-xs text-zinc-500 sm:block">
                <span className="text-lime-400">●</span> sell-side ·{" "}
                <span className="text-violet-400">●</span> consent
              </div>
            </div>
            <Stepper />
            <main>{children}</main>
            <footer className="mt-16 border-t border-violet-500/20 pt-6 text-xs text-zinc-600">
              Built for{" "}
              <span className="text-lime-400">Cursor</span> ×{" "}
              <span className="text-violet-400">Thrad</span> London 2026. The user is the
              sell-side. 🐸
            </footer>
          </div>
        </FlowProvider>
      </body>
    </html>
  );
}
