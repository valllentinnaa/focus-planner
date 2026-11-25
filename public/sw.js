// Focus Planner service worker. Its ONLY job: receive "Share → Focus Planner" on Android (Web Share
// Target). The shared text/link/images are parked in a cache box, then the app opens the Clipboard
// and files them (it has the sign-in; this worker doesn't). Nothing else is intercepted or cached.
const INBOX = "fp-share-inbox";
const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.origin !== self.location.origin || url.pathname !== "/share-target") return;
  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData();
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const str = (k) => {
          const v = form.get(k);
          return typeof v === "string" ? v.slice(0, 2000) : "";
        };
        const meta = { title: str("title"), text: str("text"), url: str("url"), files: [] };
        const cache = await caches.open(INBOX);
        const files = form.getAll("files").filter((f) => f && typeof f !== "string").slice(0, MAX_FILES);
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (!f.type.startsWith("image/") || f.size > MAX_FILE_BYTES) continue;
          const key = `/share-inbox/${id}/${i}`;
          await cache.put(key, new Response(f, { headers: { "content-type": f.type } }));
          meta.files.push(key);
        }
        await cache.put(`/share-inbox/${id}/meta`, new Response(JSON.stringify(meta), { headers: { "content-type": "application/json" } }));
      } catch {
        // Nothing useful to keep; still open the Clipboard.
      }
      return Response.redirect("/clipboard?shared=1", 303);
    })(),
  );
});
