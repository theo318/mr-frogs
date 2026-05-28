// Mr Frogs — consent options page.
// Reads/writes consent rules to chrome.storage.local so the sidebar content
// script picks up changes via chrome.storage.onChanged. Auto-saves on every
// interaction; the "Saved" pill briefly flashes for feedback.

const DEFAULTS = {
  allow_low: true,
  allow_medium: true,
  allow_high: false,
  reserve_usd: 0.01,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const checkboxes = $$('input[type="checkbox"][data-rule]');
const reserveInput = $('input[type="range"][data-rule="reserve_usd"]');
const reserveValue = $('[data-bind="reserve-value"]');
const savedPill = $('[data-bind="saved-pill"]');

let savedTimer = null;
function flashSaved() {
  savedPill.classList.add("show");
  if (savedTimer) clearTimeout(savedTimer);
  savedTimer = setTimeout(() => savedPill.classList.remove("show"), 900);
}

function renderConsent(rules) {
  for (const cb of checkboxes) {
    const key = cb.getAttribute("data-rule");
    cb.checked = !!rules[key];
    const row = cb.closest(".consent-row");
    if (row) row.classList.toggle("on", !!rules[key]);
  }
  reserveInput.value = String(rules.reserve_usd);
  reserveValue.textContent = `$${Number(rules.reserve_usd).toFixed(3)}`;
}

function loadAndRender() {
  chrome.storage.local.get(
    ["allow_low", "allow_medium", "allow_high", "reserve_usd"],
    (result) => {
      const rules = {
        allow_low:
          typeof result.allow_low === "boolean" ? result.allow_low : DEFAULTS.allow_low,
        allow_medium:
          typeof result.allow_medium === "boolean"
            ? result.allow_medium
            : DEFAULTS.allow_medium,
        allow_high:
          typeof result.allow_high === "boolean" ? result.allow_high : DEFAULTS.allow_high,
        reserve_usd:
          typeof result.reserve_usd === "number" ? result.reserve_usd : DEFAULTS.reserve_usd,
      };
      renderConsent(rules);
    },
  );
}

// Wire change handlers.
for (const cb of checkboxes) {
  cb.addEventListener("change", () => {
    const key = cb.getAttribute("data-rule");
    chrome.storage.local.set({ [key]: cb.checked }, () => {
      const row = cb.closest(".consent-row");
      if (row) row.classList.toggle("on", cb.checked);
      flashSaved();
    });
  });
}
reserveInput.addEventListener("input", () => {
  const v = parseFloat(reserveInput.value);
  reserveValue.textContent = `$${v.toFixed(3)}`;
  chrome.storage.local.set({ reserve_usd: v }, flashSaved);
});

// React to changes made elsewhere (e.g. the sidebar).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (
    !["allow_low", "allow_medium", "allow_high", "reserve_usd"].some(
      (k) => k in changes,
    )
  ) {
    return;
  }
  loadAndRender();
});

loadAndRender();
