// Web: register the service worker that receives Android shares, and read what it parked.
import type { SharedItem } from "./share-inbox";

export type { SharedItem } from "./share-inbox";

const INBOX = "fp-share-inbox";

export function registerShareWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return; // dev: keep it simple
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}

/** Everything shared but not yet filed. Call clear() once an item is safely saved. */
export async function readSharedInbox(): Promise<SharedItem[]> {
  if (typeof caches === "undefined") return [];
  try {
    const cache = await caches.open(INBOX);
    const keys = await cache.keys();
    const ids = [...new Set(keys.map((r) => new URL(r.url).pathname).filter((p) => p.endsWith("/meta")).map((p) => p.split("/")[2]!))].sort();
    const out: SharedItem[] = [];
    for (const id of ids) {
      const metaRes = await cache.match(`/share-inbox/${id}/meta`);
      if (!metaRes) continue;
      const meta = (await metaRes.json()) as { title?: string; text?: string; url?: string; files?: string[] };
      const images: Blob[] = [];
      for (const key of meta.files ?? []) {
        const r = await cache.match(key);
        if (r) images.push(await r.blob());
      }
      const mine = keys.filter((r) => new URL(r.url).pathname.startsWith(`/share-inbox/${id}/`));
      out.push({
        id,
        title: meta.title ?? "",
        text: meta.text ?? "",
        url: meta.url ?? "",
        images,
        clear: async () => {
          await Promise.all(mine.map((r) => cache.delete(r)));
        },
      });
    }
    return out;
  } catch {
    return [];
  }
}
