// Mr Frogs — ChatGPT content script.
// Shadow-DOM sidebar that captures the user's last prompt, posts to the
// Mr Frogs backend, and renders the auction inline on chatgpt.com.
// No bundler, no framework, no Anthropic key in the extension.

(function () {
  // Swap this for the Vercel URL on deploy, e.g.
  // const BACKEND_URL = "https://mr-frogs.vercel.app";
  const BACKEND_URL = "http://localhost:3000";

  // Guard against double-injection on SPA navigation.
  if (document.getElementById("mr-frogs-root")) return;

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
    reserveUsd: 0.01,
    earnedUsd: 0,
    lastUserTurnCount: 0,
  };

  // ---------- Shadow DOM root ----------
  const host = document.createElement("div");
  host.id = "mr-frogs-root";
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
  badge.setAttribute("aria-label", "Open Mr Frogs");
  badge.textContent = "$";
  shadow.appendChild(badge);

  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";
  sidebar.innerHTML = `
    <div class="header">
      <div class="brand">Mr Frogs</div>
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
      <div class="section" data-bind="profile-section" hidden>
        <div class="section-title">Intent profile</div>
        <div class="summary" data-bind="summary"></div>
        <div class="segments" data-bind="segments"></div>
      </div>

      <div class="section">
        <button
          type="button"
          class="config-link"
          data-action="open-options"
        >
          Configure consent settings →
        </button>
      </div>

      <div class="section" data-bind="bids-section" hidden>
        <div class="section-title">
          Live bids
          <span data-bind="bids-meta" style="float:right;color:#71717a;font-weight:400;letter-spacing:0;text-transform:none;"></span>
        </div>
        <div data-bind="bid-list"></div>
      </div>

      <div class="section" data-bind="sale-section" hidden>
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

  // ---------- conversation capture ----------
  function captureConversation() {
    // Primary: every rendered turn (user + assistant), in DOM order.
    const turns = document.querySelectorAll("[data-message-author-role]");
    if (turns.length > 0) {
      const lines = [];
      turns.forEach((el) => {
        const role = el.getAttribute("data-message-author-role") || "unknown";
        const text = (el.textContent || "").trim();
        if (!text) return;
        lines.push(`${role === "user" ? "User" : "Assistant"}: ${text}`);
      });
      if (lines.length > 0) return lines.join("\n\n");
    }
    // Fallback: composer text, so the manual button still works on a fresh
    // tab before the first turn has rendered.
    const ta = document.querySelector("#prompt-textarea");
    if (ta) {
      const v = (ta.value || ta.textContent || "").trim();
      if (v) return `User: ${v}`;
    }
    const ce = document.querySelector('form [contenteditable="true"]');
    if (ce) {
      const v = (ce.textContent || "").trim();
      if (v) return `User: ${v}`;
    }
    return null;
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
      const res = await fetch(`${BACKEND_URL}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threads: [{ title: "Live conversation", full_text: text }] }),
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
    ensureThradLeads();
    render();
    autoSell();
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
  function ensureThradLeads() {
    // Aggregator economics: Thrad syndicates across the network, so its bid
    // is always at least a penny above the highest direct advertiser bid.
    // We bump the displayed bid (the auction is symbolic) — Thrad still
    // never wins unless its bid is also eligible under consent + reserve.
    const isThrad = (b) => (b.advertiser || "").toLowerCase() === "thrad";
    const thradBids = state.bids.filter(isThrad);
    if (thradBids.length === 0) return;
    const otherMax = state.bids
      .filter((b) => !isThrad(b))
      .reduce((m, b) => Math.max(m, b.bid_usd || 0), 0);
    if (otherMax <= 0) return;
    const floor = Math.round((otherMax + 0.005) * 1000) / 1000;
    for (const t of thradBids) {
      if ((t.bid_usd || 0) < floor) t.bid_usd = floor;
    }
  }

  function autoSell() {
    if (state.sale) return;
    if (state.bidding) return;
    if (!state.profile) return;
    const eligible = eligibleBids();
    if (eligible.length === 0) return;
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
    } else if (action === "open-options") {
      // Ask the background service worker to open the options page —
      // content scripts can't do it directly without tripping Chrome's
      // popup blocker.
      chrome.runtime.sendMessage({ type: "open-options" }).catch(() => {
        // Last-ditch fallback. Will likely be popup-blocked, but if a
        // user gesture context survives the round-trip this might work.
        window.open(chrome.runtime.getURL("options.html"), "_blank");
      });
    }
  });


  // ---------- MutationObserver ----------
  let debounceTimer = null;
  // Only re-analyse when a NEW user message is submitted. Without this gate
  // the assistant's streaming response keeps mutating the DOM, which would
  // otherwise re-fire extraction on every token. We watch the count of
  // user turns; nothing else triggers a new run.
  const observer = new MutationObserver(() => {
    const userTurns = document.querySelectorAll('[data-message-author-role="user"]');
    if (userTurns.length <= state.lastUserTurnCount) return;
    if (state.extracting) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const currentCount = document.querySelectorAll(
        '[data-message-author-role="user"]',
      ).length;
      if (currentCount <= state.lastUserTurnCount) return;
      const text = captureConversation();
      if (!text) return;
      state.lastUserTurnCount = currentCount;
      runExtract(text);
    }, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ---------- render ----------
  function render() {
    badge.classList.toggle("hidden", state.sidebarOpen);
    sidebar.classList.toggle("open", state.sidebarOpen);

    $("earned").textContent = `$${state.earnedUsd.toFixed(2)}`;

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
        .map((s) => {
          const blocked = !allowsSensitivity(s.sensitivity);
          const blockedBanner = blocked
            ? `<div class="seg-blocked">
                 <span class="seg-blocked-tag">Not sold</span>
                 ${escapeHtml(s.sensitivity)} sensitivity is blocked in your consent settings — Overmind stopped this segment before it reached any advertiser.
               </div>`
            : "";
          return `
            <div class="segment${blocked ? " segment-blocked" : ""}">
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
              ${blockedBanner}
            </div>
          `;
        })
        .join("");
    }

    // Consent section is visible as soon as there's a profile.

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
    $("sale-section").hidden = !state.sale;
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
  chrome.storage.local.get(
    ["earnedUsd", "allow_low", "allow_medium", "allow_high", "reserve_usd"],
    (result) => {
      if (typeof result.earnedUsd === "number") state.earnedUsd = result.earnedUsd;
      if (typeof result.allow_low === "boolean") state.allowLow = result.allow_low;
      if (typeof result.allow_medium === "boolean")
        state.allowMedium = result.allow_medium;
      if (typeof result.allow_high === "boolean") state.allowHigh = result.allow_high;
      if (typeof result.reserve_usd === "number") state.reserveUsd = result.reserve_usd;
      render();
    },
  );

  // Stay in sync when the options page mutates consent rules.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let dirty = false;
    if (changes.allow_low) {
      state.allowLow = changes.allow_low.newValue;
      dirty = true;
    }
    if (changes.allow_medium) {
      state.allowMedium = changes.allow_medium.newValue;
      dirty = true;
    }
    if (changes.allow_high) {
      state.allowHigh = changes.allow_high.newValue;
      dirty = true;
    }
    if (changes.reserve_usd) {
      state.reserveUsd = changes.reserve_usd.newValue;
      dirty = true;
    }
    if (dirty) render();
  });

  // Initial auto-run: on a quiescent page (conversation already rendered,
  // no further DOM mutations), the observer won't fire. Kick off an extract
  // once after a short delay so the sidebar populates without needing a
  // manual click.
  setTimeout(() => {
    if (state.profile || state.extracting) return;
    const userTurns = document.querySelectorAll('[data-message-author-role="user"]');
    if (userTurns.length === 0) return;
    const text = captureConversation();
    if (!text) return;
    state.lastUserTurnCount = userTurns.length;
    runExtract(text);
  }, 1500);
  loadAdvertisers();
  render();
})();
