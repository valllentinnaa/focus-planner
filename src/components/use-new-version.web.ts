// Web/PWA: notices when a newer build is live (see lib/app-version) so we can offer a reload.
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CHECK_EVERY_MS, entryBundle, hasNewVersion, shouldCheck } from "@/lib/app-version";

function loadedBundle() {
  for (const s of Array.from(document.scripts)) {
    const hit = entryBundle(s.src);
    if (hit) return hit;
  }
  return null;
}

export function useNewVersion() {
  const qc = useQueryClient();
  const [latest, setLatest] = useState<string | null>(null);
  const [current] = useState(loadedBundle);

  useEffect(() => {
    if (!current) return; // dev server: nothing to compare
    let last = 0;
    let stopped = false;
    const check = async () => {
      const now = Date.now();
      if (!shouldCheck(last, now)) return;
      last = now;
      try {
        const res = await fetch(`/?v=${now}`, { cache: "no-store" });
        if (!res.ok) return;
        const found = entryBundle(await res.text());
        if (!stopped && hasNewVersion(current, found)) setLatest(found);
      } catch {
        // offline: try again later
      }
    };
    const onVisible = () => document.visibilityState === "visible" && void check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [current]);

  const reload = async () => {
    // Let any change still being saved finish first (up to 5 s), so nothing typed is lost.
    for (let i = 0; i < 50 && qc.isMutating() > 0; i++) await new Promise((r) => setTimeout(r, 100));
    window.location.reload();
  };

  return { version: latest, reload };
}
