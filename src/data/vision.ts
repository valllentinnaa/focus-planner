// The 12W vision board: images (private bucket, owner-only) and short words, per cycle.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { env } from "@/lib/env";
import type { PickedFile } from "@/lib/pick-file";
import { shrinkImage } from "@/lib/resize-image";
import { supabase } from "@/lib/supabase";
import type { VisionItemRow } from "@/lib/database.types";
import { useUserId } from "./auth";
import { newId, useItems } from "./items";

const BUCKET = "vision-board";
/** Demo mode has no storage: images are kept inline (they're shrunk first, so they stay small). */
const DEMO_PREFIX = "demo:";
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic" };

const toDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

export function useVisionBoard(quarterId: string | null) {
  const userId = useUserId();
  const list = useItems({
    table: "vision_items",
    filters: { quarter_id: quarterId ?? "" },
    orderBy: ["position", "created_at"],
    enabled: !!quarterId,
  });
  const [uploading, setUploading] = useState(0);

  /** Upload first, then save the row; if saving fails, the file is removed again (no orphans). */
  const addImages = async (files: PickedFile[]) => {
    if (!quarterId || !userId) return 0;
    let failed = 0;
    setUploading((n) => n + files.length);
    let position = list.items.length;
    for (const f of files) {
      try {
        const small = await shrinkImage(f.body as Blob & { type: string });
        let path: string;
        if (env.demo) {
          path = DEMO_PREFIX + (await toDataUrl(small.body));
        } else {
          path = `${userId}/${newId()}.${EXT[small.type] ?? "jpg"}`;
          const up = await supabase.storage.from(BUCKET).upload(path, small.body, { contentType: small.type, upsert: false });
          if (up.error) throw up.error;
        }
        list.add({ quarter_id: quarterId, kind: "image", file_path: path, text: "", position: position++ });
      } catch {
        failed++;
      } finally {
        setUploading((n) => n - 1);
      }
    }
    return failed;
  };

  const addWords = () =>
    quarterId ? list.add({ quarter_id: quarterId, kind: "text", text: "", position: list.items.length }) : null;

  const remove = async (item: VisionItemRow) => {
    list.remove(item.id);
    if (item.file_path && !item.file_path.startsWith(DEMO_PREFIX)) {
      await supabase.storage.from(BUCKET).remove([item.file_path]);
    }
  };

  return {
    items: list.items,
    loading: list.loading,
    uploading,
    addImages,
    addWords,
    setText: (id: string, text: string) => list.update(id, { text }),
    remove,
  };
}

/** Short-lived links for the board's images (the bucket is private). */
export function useVisionImageUrls(paths: string[]) {
  const stored = paths.filter((p) => !p.startsWith(DEMO_PREFIX));
  const key = [...stored].sort().join("|");
  const q = useQuery({
    queryKey: ["vision-urls", key],
    enabled: !env.demo && stored.length > 0,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(stored, 3600);
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl as string]),
      ) as Record<string, string>;
    },
  });
  const urls: Record<string, string> = { ...(q.data ?? {}) };
  for (const p of paths) if (p.startsWith(DEMO_PREFIX)) urls[p] = p.slice(DEMO_PREFIX.length);
  return urls;
}
