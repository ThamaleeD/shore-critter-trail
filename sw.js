const CACHE = "critter-trail-v3";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Mono:wght@500&display=swap";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FILES);
    try {
      const res = await fetch(FONT_CSS);
      await cache.put(FONT_CSS, res.clone());
      const css = await res.text();
      const fontFiles = [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
      await Promise.all(fontFiles.map(url => fetch(url).then(r => cache.put(url, r)).catch(() => {})));
    } catch (e) {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = event.request.mode === "navigate" ? "./index.html" : event.request;
    const cached = await cache.match(key, { ignoreSearch: event.request.mode === "navigate" });
    const fresh = fetch(event.request).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { event.waitUntil(fresh); return cached; }
    return (await fresh) || new Response("Offline", { status: 503 });
  })());
});