// iOS/Android: over-the-air updates (expo-updates). Checks when the app opens or comes back to the
// foreground, downloads in the background, then offers a reload. No-op in development builds.
import { useEffect } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";
import { shouldCheck } from "@/lib/app-version";

export function useNewVersion() {
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();

  useEffect(() => {
    if (!Updates.isEnabled || __DEV__) return;
    let last = 0;
    const check = async () => {
      const now = Date.now();
      if (!shouldCheck(last, now)) return;
      last = now;
      try {
        const r = await Updates.checkForUpdateAsync();
        if (r.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // offline or server issue: try again next time
      }
    };
    void check();
    const sub = AppState.addEventListener("change", (s) => s === "active" && void check());
    return () => sub.remove();
  }, []);

  return {
    version: isUpdatePending ? (downloadedUpdate?.updateId ?? "pending") : null,
    reload: () => Updates.reloadAsync(),
  };
}
