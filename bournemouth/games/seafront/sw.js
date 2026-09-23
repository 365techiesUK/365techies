// Service worker for /bournemouth/games/seafront/ — and it deliberately does almost nothing.
//
// WHY IT EXISTS AT ALL. Chrome will not fire `beforeinstallprompt` - the event the "Add to
// home screen" button depends on - unless the page is controlled by a service worker that has
// a `fetch` handler. That is the entire reason for this file. It is not a caching layer and it
// must not become one.
//
// ⚠️ IT MUST NEVER CACHE. Two independent reasons, both learned the hard way on this site:
//   1. SiteGround's proxy already caches every .js under this path for a YEAR (immutable) and
//      serves stale CONTENT from it - measured, and the reason the game's modules live under a
//      bN build folder that changes on every deploy. A second cache on top of that would add
//      a layer nobody can flush from the outside, on a device we cannot reach.
//   2. A service worker that caches outlives the tab. Get it wrong and a visitor is pinned to
//      a broken build with no way back but clearing site data - on a business's live website.
//
// So: no install handler that pre-caches, no cache storage, and a fetch handler that does not
// call respondWith(). Not calling it means "let the network handle this normally", which is
// exactly the behaviour we want and still satisfies the installability check.
//
// skipWaiting + clients.claim so a replacement takes over immediately rather than waiting for
// every tab to close - if this file ever does need changing, the change should land at once.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Belt and braces: if a future edit ever DOES cache something, or an older version of this
    // file did, clear it on activation so no visitor is stranded on a stale copy.
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch { /* caches unavailable: nothing to clean up */ }
    await self.clients.claim();
  })());
});

// The handler that makes the page installable. Deliberately empty: no respondWith() means the
// request goes to the network untouched.
self.addEventListener('fetch', () => {});
