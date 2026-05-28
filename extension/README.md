# Mr Frogs — Chrome extension

The native ChatGPT UX layer for Mr Frogs. Renders a Shadow-DOM-isolated sidebar on `chatgpt.com` that extracts an intent profile from your prompts, runs an advertiser auction, and lets you approve sales — all calling the existing Next.js backend.

## Load it

1. Make sure the backend is running. From the repo root: `npm run dev` (defaults to `http://localhost:3000`).
2. Open `chrome://extensions` in Chrome / Brave / Arc.
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked**.
5. Select this `extension/` folder.
6. Open <https://chatgpt.com>. A `$` badge appears bottom-right — click to open the sidebar.

## Use it

- Type a prompt in ChatGPT. The extension picks up new user messages automatically and runs extraction.
- If automatic detection misses (ChatGPT's DOM changes occasionally), click **Analyse last prompt** in the sidebar — that's the always-works fallback path.
- Adjust the sensitivity toggles and reserve price. Bids that fail those rules are visibly blocked.
- Click **Approve top eligible sale** to close the auction. Your earnings persist across reloads via `chrome.storage.local`.

## Deploy

When you ship the backend to Vercel, swap the `BACKEND_URL` constant at the top of `content.js`:

```js
const BACKEND_URL = "https://your-app.vercel.app";
```

Reload the unpacked extension (the circular arrow on the extension card in `chrome://extensions`).

The backend's `next.config.js` already allows CORS from `https://chatgpt.com`. If you change the extension's host, update the `Access-Control-Allow-Origin` header in `next.config.js` and the `OPTIONS` handlers in `app/api/*/route.ts`.

## Files

- `manifest.json` — MV3 manifest, host permission for `chatgpt.com`, `storage` permission, `content.js` injected on `document_idle`.
- `content.js` — vanilla JS content script. Shadow DOM sidebar, MutationObserver, API calls. No bundler, no framework.
- `sidebar.css` — fetched at runtime and injected as a `<style>` inside the Shadow root. Dark zinc palette.

## Privacy

- Prompt text is sent to `BACKEND_URL/api/extract`. The backend forwards it to the Anthropic API.
- No Anthropic API key ever lives in the extension. The backend holds it.
- The extension never logs prompt text to the console.
- Earnings counter is stored locally via `chrome.storage.local` — never sent anywhere.
