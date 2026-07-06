import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mr Frogs 🐸",
  description: "Your prompts. Your data. Your earnings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-lime-400/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-24 h-[520px] w-[520px] rounded-full bg-violet-600/15 blur-3xl" />
        </div>
        {children}
      </body>
    </html>
  );
}
