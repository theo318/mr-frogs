// Intent Exchange — ChatGPT content script.
// Shadow-DOM sidebar that captures the user's last prompt, posts to the
// Intent Exchange backend, and renders the auction inline on chatgpt.com.
// No bundler, no framework, no Anthropic key in the extension.

(function () {
  // Swap this for the Vercel URL on deploy, e.g.
  // const BACKEND_URL = "https://intent-exchange.vercel.app";
  const BACKEND_URL = "http://localhost:3000";

  // Guard against double-injection on SPA navigation.
  if (document.getElementById("intent-exchange-root")) return;

  // ---------- state ----------
  const state = {
    sidebarOpen: false,
    advertisers: [],
    profile: null,
    bids: [],
    sale: null,
    extracting: false,
    bidding: false,
    extractError: null,
    allowLow: true,
    allowMedium: true,
    allowHigh: false,
    reserveUsd: 0.1,
    autoSell: false,
    scope: "last", // "last" = last prompt only, "conversation" = full thread
    earnedUsd: 0,
    lastPromptHash: null,
  };

  // ---------- Shadow DOM root ----------
  const host = document.createElement("div");
  host.id = "intent-exchange-root";
  host.style.cssText = "all: initial; position: relative; z-index: 2147483646;";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  // Load CSS file into shadow root as a <style> element.
  fetch(chrome.runtime.getURL("sidebar.css"))
    .then((r) => r.text())
    .then((css) => {
      const styleEl = document.createElement("style");
      styleEl.textContent = css;
      shadow.appendChild(styleEl);
    });

  // ---------- DOM scaffold ----------
  const badge = document.createElement("button");
  badge.className = "badge";
  badge.type = "button";
  badge.setAttribute("aria-label", "Open Intent Exchange");
  badge.textContent = "$";
  shadow.appendChild(badge);

  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";
  sidebar.innerHTML = `
    <div class="header">
      <div class="brand">Intent exchange</div>
      <button type="button" class="close-btn" data-action="close" aria-label="Close">×</button>
    </div>
    <div class="earned">
      <div class="earned-text">
        <div class="earned-label">$ earned</div>
        <div class="earned-amount" data-bind="earned">$0.00</div>
      </div>
      <span class="frog" aria-hidden="true">🐸</span>
    </div>
    <div class="body">
      <div class="section">
        <div class="section-title">Sell</div>
        <div class="scope-toggle">
          <button type="button" class="scope-opt" data-scope="last" data-bind="scope-last">Last prompt</button>
          <button type="button" class="scope-opt" data-scope="conversation" data-bind="scope-conv">Whole conversation</button>
        </div>
        <button type="button" class="primary" data-action="analyse" data-bind="analyse-btn" style="margin-top: 8px;">
          Analyse last prompt
        </button>
      </div>

      <div class="section" data-bind="profile-section" hidden>
        <div class="section-title">Intent profile</div>
        <div class="summary" data-bind="summary"></div>
        <div class="segments" data-bind="segments"></div>
      </div>

      <div class="section" data-bind="consent-section" hidden>
        <div class="section-title">Consent</div>
        <label class="consent-row" data-bind="row-low">
          <span class="label-text"><span class="dot"></span>Low — general commercial</span>
          <input type="checkbox" data-bind="allow-low" />
        </label>
        <label class="consent-row" data-bind="row-medium">
          <span class="label-text"><span class="dot"></span>Medium — career / finance</span>
          <input type="checkbox" data-bind="allow-medium" />
        </label>
        <label class="consent-row" data-bind="row-high">
          <span class="label-text"><span class="dot"></span>High — sensitive</span>
          <input type="checkbox" data-bind="allow-high" />
        </label>
        <div class="reserve-row">
          <label>Reserve price</label>
          <div class="slider-wrap">
            <input type="range" min="0" max="1" step="0.05" data-bind="reserve" />
            <div class="reserve-value" data-bind="reserve-value">$0.10</div>
          </div>
          <div class="reserve-hint">Bids below this don't complete.</div>
        </div>
        <label class="consent-row autosell-row" data-bind="row-autosell" style="margin-top: 14px;">
          <span class="label-text">
            <span class="dot"></span>
            Auto-sell — accept top eligible bid
          </span>
          <input type="checkbox" data-bind="auto-sell" />
        </label>
      </div>

      <div class="section" data-bind="bids-section" hidden>
        <div class="section-title">
          Live bids
          <span data-bind="bids-meta" style="float:right;color:#71717a;font-weight:400;letter-spacing:0;text-transform:none;"></span>
        </div>
        <div data-bind="bid-list"></div>
      </div>

      <div class="section" data-bind="sale-section" hidden>
        <button type="button" class="primary" data-action="approve" data-bind="approve-btn">
          Approve top eligible sale
        </button>
        <div data-bind="sale-receipt"></div>
      </div>

      <div class="section" data-bind="error-section" hidden>
        <div class="empty" data-bind="error-text"></div>
      </div>
    </div>
  `;
  shadow.appendChild(sidebar);

  const $ = (name) => sidebar.querySelector(`[data-bind="${name}"]`);

  // ---------- helpers ----------
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );
  }
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return h.toString(36);
  }
  function allowsSensitivity(s) {
    return (
      (s === "low" && state.allowLow) ||
      (s === "medium" && state.allowMedium) ||
      (s === "high" && state.allowHigh)
    );
  }
  function eligibleBids() {
    if (!state.profile) return [];
    const byId = new Map(state.profile.segments.map((s) => [s.id, s]));
    return state.bids
      .filter((b) => {
        const seg = byId.get(b.segment_id);
        if (!seg) return false;
        if (!allowsSensitivity(seg.sensitivity)) return false;
        if (b.bid_usd < state.reserveUsd) return false;
        return true;
      })
      .sort((a, b) => b.bid_usd - a.bid_usd);
  }
  function blockedBids() {
    if (!state.profile) return [];
    const byId = new Map(state.profile.segments.map((s) => [s.id, s]));
    return state.bids.filter((b) => {
      const seg = byId.get(b.segment_id);
      if (!seg) return false;
      return !allowsSensitivity(seg.sensitivity) || b.bid_usd < state.reserveUsd;
    });
  }

  // ---------- prompt capture ----------
  function captureLastPrompt() {
    // Primary: rendered user turn in the conversation.
    const turns = document.querySelectorAll('[data-message-author-role="user"]');
    if (turns.length > 0) {
      const last = turns[turns.length - 1];
      const text = (last.textContent || "").trim();
      if (text) return text;
    }
    // Fallback 1: ChatGPT's composer textarea.
    const ta = document.querySelector("#prompt-textarea");
    if (ta) {
      const v = (ta.value || ta.textContent || "").trim();
      if (v) return v;
    }
    // Fallback 2: any contenteditable composer.
    const ce = document.querySelector('form [contenteditable="true"]');
    if (ce) {
      const v = (ce.textContent || "").trim();
      if (v) return v;
    }
    return null;
  }

  function captureWholeConversation() {
    // All rendered turns, user + assistant, in DOM order.
    const turns = document.querySelectorAll('[data-message-author-role]');
    if (turns.length === 0) return null;
    const lines = [];
    turns.forEach((el) => {
      const role = el.getAttribute("data-message-author-role") || "unknown";
      const text = (el.textContent || "").trim();
      if (!text) return;
      lines.push(`${role === "user" ? "User" : "Assistant"}: ${text}`);
    });
    if (lines.length === 0) return null;
    return lines.join("\n\n");
  }

  function captureForScope() {
    return state.scope === "conversation"
      ? captureWholeConversation()
      : captureLastPrompt();
  }

  // ---------- API ----------
  async function runExtract(text) {
    state.extracting = true;
    state.profile = null;
    state.bids = [];
    state.sale = null;
    state.extractError = null;
    render();
    try {
      const title = state.scope === "conversation" ? "Live conversation" : "Live prompt";
      const res = await fetch(`${BACKEND_URL}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threads: [{ title, full_text: text }] }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `extract failed (${res.status})`);
      }
      const { profile } = await res.json();
      state.profile = profile;
      state.extracting = false;
      render();
      runAuction();
    } catch (e) {
      state.extracting = false;
      state.extractError = e && e.message ? e.message : "Extraction failed.";
      render();
    }
  }

  async function runAuction() {
    if (!state.profile) return;
    if (state.advertisers.length === 0) {
      // Try to load now if the initial fetch failed/was slow.
      await loadAdvertisers();
      if (state.advertisers.length === 0) return;
    }
    state.bidding = true;
    state.bids = [];
    render();

    const tasks = [];
    for (const advertiser of state.advertisers) {
      for (const segment of state.profile.segments) {
        const p = fetch(`${BACKEND_URL}/api/bid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ advertiser, segment }),
        })
          .then((r) => r.json())
          .then((j) => {
            if (j && j.bid) {
              state.bids.push(j.bid);
              render();
            }
          })
          .catch(() => {});
        tasks.push(p);
      }
    }
    await Promise.allSettled(tasks);
    state.bidding = false;
    render();
    maybeAutoSell();
  }

  async function loadAdvertisers() {
    try {
      const r = await fetch(`${BACKEND_URL}/api/advertisers`);
      if (!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j.advertisers)) state.advertisers = j.advertisers;
    } catch {
      // backend may be down — manual button still works once it comes back
    }
  }

  // ---------- actions ----------
  function maybeAutoSell() {
    if (!state.autoSell) return;
    if (state.sale) return;
    if (state.bidding) return;
    const eligible = eligibleBids();
    if (eligible.length === 0) return;
    approveSale();
  }

  function approveSale() {
    const eligible = eligibleBids();
    if (eligible.length === 0 || !state.profile) return;
    const winner = eligible[0];
    state.sale = {
      segment_id: winner.segment_id,
      advertiser: winner.advertiser,
      price_usd: winner.bid_usd,
      ad_creative_hook: winner.ad_creative_hook,
      timestamp: new Date().toISOString(),
    };
    state.earnedUsd = Math.round((state.earnedUsd + winner.bid_usd) * 100) / 100;
    chrome.storage.local.set({ earnedUsd: state.earnedUsd });
    render();
  }

  // ---------- event wiring ----------
  badge.addEventListener("click", () => {
    state.sidebarOpen = true;
    render();
  });

  sidebar.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const action = t.getAttribute("data-action");
    if (action === "close") {
      state.sidebarOpen = false;
      render();
    } else if (action === "analyse") {
      const text = captureForScope();
      if (!text) {
        state.extractError = "No prompt found yet. Send a message in ChatGPT and try again.";
        render();
        return;
      }
      runExtract(text);
    } else if (action === "approve") {
      approveSale();
    }
    const scope = t.getAttribute("data-scope");
    if (scope === "last" || scope === "conversation") {
      state.scope = scope;
      chrome.storage.local.set({ scope });
      render();
    }
  });

  $("allow-low").addEventListener("change", (e) => {
    state.allowLow = e.target.checked;
    render();
  });
  $("allow-medium").addEventListener("change", (e) => {
    state.allowMedium = e.target.checked;
    render();
  });
  $("allow-high").addEventListener("change", (e) => {
    state.allowHigh = e.target.checked;
    render();
  });
  $("reserve").addEventListener("input", (e) => {
    state.reserveUsd = parseFloat(e.target.value);
    render();
  });
  $("auto-sell").addEventListener("change", (e) => {
    state.autoSell = e.target.checked;
    chrome.storage.local.set({ autoSell: state.autoSell });
    // If toggled on with a completed auction that still has eligible bids, fire now.
    if (state.autoSell) maybeAutoSell();
    render();
  });

  // ---------- MutationObserver ----------
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    const text = captureForScope();
    if (!text) return;
    const h = hash(text);
    if (h === state.lastPromptHash) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Only auto-run if we actually captured a rendered user turn,
      // not just the composer (which the manual button covers).
      const haveTurn = document.querySelector('[data-message-author-role="user"]');
      if (!haveTurn) return;
      state.lastPromptHash = h;
      runExtract(text);
    }, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ---------- render ----------
  function render() {
    badge.classList.toggle("hidden", state.sidebarOpen);
    sidebar.classList.toggle("open", state.sidebarOpen);

    $("earned").textContent = `$${state.earnedUsd.toFixed(2)}`;
    $("analyse-btn").disabled = state.extracting;
    $("analyse-btn").textContent = state.extracting
      ? "Extracting…"
      : state.scope === "conversation"
        ? "Analyse whole conversation"
        : "Analyse last prompt";
    $("scope-last").classList.toggle("on", state.scope === "last");
    $("scope-conv").classList.toggle("on", state.scope === "conversation");

    // Profile + consent visibility.
    const showProfile = state.extracting || !!state.profile;
    $("profile-section").hidden = !showProfile;
    if (state.extracting && !state.profile) {
      $("summary").className = "summary loading";
      $("summary").textContent = "Reading your prompt…";
      $("segments").innerHTML = "";
    } else if (state.profile) {
      $("summary").className = "summary";
      $("summary").textContent = state.profile.summary || "";
      $("segments").innerHTML = state.profile.segments
        .map(
          (s) => `
            <div class="segment">
              <div class="seg-head">
                <div>
                  <div class="seg-label">${escapeHtml(s.label)}</div>
                  <div class="seg-category">${escapeHtml(s.category)}</div>
                </div>
                <span class="sens-tag ${escapeHtml(s.sensitivity)}">${escapeHtml(
                  s.sensitivity,
                )}</span>
              </div>
              <div class="seg-meta">
                <span>${Math.round((s.intent_score || 0) * 100)}% intent</span>
                <span class="floor">$${(s.floor_price_usd || 0).toFixed(2)} floor</span>
              </div>
            </div>
          `,
        )
        .join("");
    }

    // Consent section is visible as soon as there's a profile.
    $("consent-section").hidden = !state.profile;
    $("allow-low").checked = state.allowLow;
    $("allow-medium").checked = state.allowMedium;
    $("allow-high").checked = state.allowHigh;
    $("row-low").classList.toggle("on", state.allowLow);
    $("row-medium").classList.toggle("on", state.allowMedium);
    $("row-high").classList.toggle("on", state.allowHigh);
    $("reserve").value = String(state.reserveUsd);
    $("reserve-value").textContent = `$${state.reserveUsd.toFixed(2)}`;
    $("auto-sell").checked = state.autoSell;
    $("row-autosell").classList.toggle("on", state.autoSell);

    // Bids list.
    const eligible = eligibleBids();
    const blocked = blockedBids();
    const haveBids = state.bids.length > 0;
    $("bids-section").hidden = !(haveBids || state.bidding);
    $("bids-meta").textContent = state.bidding
      ? `bidding · ${eligible.length} eligible`
      : `${eligible.length} eligible · ${blocked.length} blocked`;
    $("bid-list").innerHTML = [
      ...eligible.map((b, i) => bidRow(b, "eligible", i + 1)),
      ...blocked.map((b) => bidRow(b, "blocked", null)),
    ].join("");

    // Sale section.
    $("sale-section").hidden = !state.profile;
    $("approve-btn").disabled = eligible.length === 0 || !!state.sale;
    $("sale-receipt").innerHTML = state.sale
      ? `
        <div class="sale">
          <div class="sale-label">Sold</div>
          <div class="sale-amount">$${state.sale.price_usd.toFixed(2)}</div>
          <div class="sale-meta">
            <span class="key">${escapeHtml(state.sale.advertiser)}</span>
            <span style="color:#52525b"> → </span>
            <span class="key">${escapeHtml(state.sale.segment_id)}</span>
          </div>
          <div class="sale-hook">"${escapeHtml(state.sale.ad_creative_hook)}"</div>
        </div>
      `
      : "";

    // Errors.
    $("error-section").hidden = !state.extractError;
    if (state.extractError) $("error-text").textContent = state.extractError;
  }

  function bidRow(bid, status, rank) {
    return `
      <div class="bid ${status === "blocked" ? "blocked" : ""}">
        <div class="bid-main">
          <div class="bid-head">
            ${rank ? `<span class="rank">#${rank}</span>` : ""}
            <span class="adv">${escapeHtml(bid.advertiser)}</span>
            <span class="arrow">→</span>
            <span class="seg">${escapeHtml(bid.segment_id)}</span>
          </div>
          <div class="bid-hook">"${escapeHtml(bid.ad_creative_hook)}"</div>
        </div>
        <div>
          <div class="bid-amount">$${(bid.bid_usd || 0).toFixed(2)}</div>
          <div class="bid-status ${status === "blocked" ? "blocked-text" : "eligible"}">
            ${status}
          </div>
        </div>
      </div>
    `;
  }

  // ---------- bootstrap ----------
  chrome.storage.local.get(["earnedUsd", "autoSell", "scope"], (result) => {
    if (typeof result.earnedUsd === "number") state.earnedUsd = result.earnedUsd;
    if (typeof result.autoSell === "boolean") state.autoSell = result.autoSell;
    if (result.scope === "last" || result.scope === "conversation") state.scope = result.scope;
    render();
  });
  loadAdvertisers();
  render();
})();
