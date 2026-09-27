// FitTrack service worker
// Bump VERSION whenever you want every device to drop its old cached copy.
const VERSION = "fittrack-v2";
const SHELL = [
  "./", "index.html", "log.html", "day.html", "analytics.html", "foods.html", "offline.html",
  "styles.css", "app.js", "config.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/favicon-32.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache your data or login: always go to Supabase / Open Food Facts directly.
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("openfoodfacts.org")) return;

  // Your own files: network first (so updates show immediately), cache as fallback when offline.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("offline.html");
        return Response.error();
      })
    );
    return;
  }

  // Libraries and fonts from CDNs: serve from cache, refresh in the background.
  if (/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) {
    e.respondWith(
      caches.open(VERSION).then(async c => {
        const hit = await c.match(req);
        const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
