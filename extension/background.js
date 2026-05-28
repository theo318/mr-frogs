// Mr Frogs — minimal background service worker.
//
// Only purpose: open the options page when the content script asks.
// MV3 content scripts can't reliably call chrome.runtime.openOptionsPage()
// themselves (Chrome's popup blocker intercepts the navigation when it
// originates inside a content-script click handler). Routing through a
// service worker is the canonical MV3 pattern.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "open-options") {
    chrome.runtime.openOptionsPage().then(
      () => sendResponse({ ok: true }),
      (err) => sendResponse({ ok: false, error: String(err) }),
    );
    return true; // keep the message channel open for the async response
  }
});
