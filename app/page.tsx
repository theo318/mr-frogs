export default function Home() {
  const installSteps = [
    {
      step: "1",
      title: "Download the extension",
      body: (
        <>
          <a
            href="https://github.com/theo318/mr-frogs/archive/refs/heads/main.zip"
            className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
          >
            Download ZIP
          </a>
          <p className="mt-2 text-sm text-zinc-400">
            Unzip it anywhere on your computer.
          </p>
        </>
      ),
    },
    {
      step: "2",
      title: "Open Chrome extensions",
      body: (
        <p className="text-sm text-zinc-400">
          In Chrome, Brave, or Arc go to{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-lime-400">
            chrome://extensions
          </code>
        </p>
      ),
    },
    {
      step: "3",
      title: "Enable Developer mode",
      body: (
        <p className="text-sm text-zinc-400">
          Toggle <span className="font-medium text-zinc-200">Developer mode</span> on — it&apos;s in the top-right corner of the extensions page.
        </p>
      ),
    },
    {
      step: "4",
      title: 'Click "Load unpacked"',
      body: (
        <p className="text-sm text-zinc-400">
          Select the{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-lime-400">extension/</code>{" "}
          folder from inside the unzipped download.
        </p>
      ),
    },
    {
      step: "5",
      title: "Go to ChatGPT",
      body: (
        <p className="text-sm text-zinc-400">
          Head to{" "}
          <a href="https://chatgpt.com" className="text-violet-400 underline underline-offset-2 hover:text-violet-300">
            chatgpt.com
          </a>
          . A{" "}
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-lime-400 text-[10px] font-bold text-zinc-950">
            $
          </span>{" "}
          badge appears in the bottom-right corner — click it to open the sidebar.
        </p>
      ),
    },
  ];

  const usageCards = [
    {
      icon: "💬",
      title: "Type a prompt",
      body: "Write anything in ChatGPT as normal. Mr Frogs automatically picks up your message and extracts an intent profile from it.",
    },
    {
      icon: "🔍",
      title: "If it misses, click Analyse",
      body: "ChatGPT's DOM changes occasionally. If the sidebar doesn't react, hit \"Analyse last prompt\" — that's the always-works fallback.",
    },
    {
      icon: "⚙️",
      title: "Tune your rules",
      body: "Use the sensitivity toggles and reserve price slider to control which bids are eligible. Bids that fail your rules are visibly blocked.",
    },
    {
      icon: "✅",
      title: "Approve a sale",
      body: "Click \"Approve top eligible sale\" to close the auction. Your earnings persist across reloads.",
    },
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-16 text-center">
        <span className="frog-hero text-7xl" aria-hidden="true">🐸</span>
        <h1 className="mt-4 text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-lime-300 to-emerald-400 bg-clip-text text-transparent">Mr</span>
          {" "}
          <span className="bg-gradient-to-r from-violet-300 to-fuchsia-400 bg-clip-text text-transparent">Frogs</span>
        </h1>
        <p className="mt-3 text-lg text-zinc-400">Your prompts. Your data. Your earnings.</p>
        <p className="mt-2 text-sm text-zinc-500">
          A Chrome extension that sits inside ChatGPT and lets advertisers bid on your intent — with you in full control of every sale.
        </p>
      </div>

      <section className="mb-16">
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-lime-400">Install</h2>
        <div className="space-y-6">
          {installSteps.map(({ step, title, body }) => (
            <div key={step} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-lime-400/30 bg-lime-400/10 text-sm font-bold text-lime-400">
                {step}
              </div>
              <div className="pt-0.5">
                <p className="mb-1.5 font-medium text-zinc-100">{title}</p>
                {body}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-violet-400">How to use it</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {usageCards.map(({ icon, title, body }) => (
            <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="mb-2 text-2xl">{icon}</div>
              <p className="mb-1 font-medium text-zinc-100">{title}</p>
              <p className="text-sm text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Privacy</h2>
        <ul className="space-y-1.5 text-sm text-zinc-400">
          <li>🔒 Your Anthropic API key never touches the extension — it lives server-side only.</li>
          <li>🚫 Prompt text is never logged to the console or stored remotely.</li>
          <li>💾 Your earnings are stored locally via <code className="rounded bg-zinc-800 px-1 text-zinc-300">chrome.storage.local</code> — never sent anywhere.</li>
        </ul>
      </section>

      <footer className="mt-16 text-center text-xs text-zinc-600">
        Built for <span className="text-lime-400">Cursor</span> × <span className="text-violet-400">Thrad</span> London 2026 · The user is the sell-side 🐸
      </footer>
    </main>
  );
}
