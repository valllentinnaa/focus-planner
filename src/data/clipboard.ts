// Clipboard (quick dump). Giving a line a date moves it into the planner as a task on that day.
// A line can also be a voice note (private bucket, owner-only).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { taskFromClipboard } from "@/lib/clipboard";
import type { ClipboardItemRow } from "@/lib/database.types";
import { env } from "@/lib/env";
import { rawDb, supabase } from "@/lib/supabase";
import type { Recording } from "@/lib/voice";
import { useUserId } from "./auth";
import { newId, useItems } from "./items";

const BUCKET = "clipboard-voice";
/** Same numbers as public.voice_note_limit() in the database (which is what actually enforces it). */
export const VOICE_LIMIT = { free: 10, pro: 1000 } as const;
export type Plan = keyof typeof VOICE_LIMIT;

/** The user's plan. Only the server can change it; no row means free. */
export function usePlan(): Plan {
  const userId = useUserId();
  const q = useQuery({
    queryKey: ["entitlements", userId],
    enabled: !env.demo && !!userId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("entitlements").select("plan").maybeSingle();
      if (error) throw error;
      return (data?.plan as Plan | undefined) ?? "free";
    },
  });
  return q.data ?? "free";
}

/** The database refuses the upload or the line once you're at your limit. */
export const isVoiceLimitError = (e: unknown) =>
  /voice_note_limit|row-level security/i.test(String((e as { message?: string })?.message ?? e));
/** Demo mode has no storage: recordings are kept inline. */
const DEMO_PREFIX = "demo:";

const toDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

export function useClipboard() {
  const userId = useUserId();
  const list = useItems({
    table: "clipboard_items",
    filters: {},
    orderBy: ["position", "created_at"],
  });
  const qc = useQueryClient();
  const [saving, setSaving] = useState(0);

  /**
   * Create the task first; only once it's saved, take the line off the clipboard. A voice note
   * stays on the clipboard (tasks can't hold a recording), so the recording is never lost.
   */
  const moveToDay = async (item: ClipboardItemRow, iso: string) => {
    const text = item.text.trim() || (item.audio_path ? "Voice note" : "");
    const { error } = await rawDb
      .from("tasks")
      .insert({ id: newId(), ...taskFromClipboard(text, iso) });
    if (error) throw error;
    if (!item.audio_path) list.remove(item.id);
    await qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  /** Upload first, then save the line; if saving fails, the upload is removed (no orphans). */
  const addVoice = async (rec: Recording, text = "") => {
    if (!userId) return;
    setSaving((n) => n + 1);
    let path: string | null = null;
    try {
      if (env.demo) {
        path = DEMO_PREFIX + (await toDataUrl(rec.blob));
      } else {
        path = `${userId}/${newId()}.${rec.ext}`;
        const up = await supabase.storage
          .from(BUCKET)
          .upload(path, rec.blob, { contentType: rec.type, upsert: false });
        if (up.error) throw up.error;
      }
      const { error } = await rawDb.from("clipboard_items").insert({
        id: newId(),
        text: text.trim().slice(0, 500),
        attention: false,
        position: list.items.length,
        audio_path: path,
        audio_seconds: Math.min(600, Math.max(0, rec.seconds)),
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["clipboard_items"] });
    } catch (e) {
      if (path && !path.startsWith(DEMO_PREFIX)) await supabase.storage.from(BUCKET).remove([path]);
      throw e;
    } finally {
      setSaving((n) => n - 1);
    }
  };

  /** Delete the line; its recording goes with it. */
  const removeItem = async (item: ClipboardItemRow) => {
    list.remove(item.id);
    if (item.audio_path && !item.audio_path.startsWith(DEMO_PREFIX)) {
      await supabase.storage.from(BUCKET).remove([item.audio_path]);
    }
  };

  return { ...list, moveToDay, addVoice, removeItem, savingVoice: saving > 0 };
}

/** Short-lived links to play the recordings (the bucket is private). */
export function useClipboardVoiceUrls(paths: (string | null | undefined)[]) {
  const all = [...new Set(paths.filter((p): p is string => !!p))];
  const stored = all.filter((p) => !p.startsWith(DEMO_PREFIX)).sort();
  const q = useQuery({
    queryKey: ["clipboard-voice-urls", stored.join("|")],
    enabled: !env.demo && stored.length > 0,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(stored, 3600);
      if (error) throw error;
      return Object.fromEntries(
        (data ?? [])
          .filter((d) => d.signedUrl && d.path)
          .map((d) => [d.path!, d.signedUrl as string]),
      ) as Record<string, string>;
    },
  });
  const urls: Record<string, string> = { ...(q.data ?? {}) };
  for (const p of all) if (p.startsWith(DEMO_PREFIX)) urls[p] = p.slice(DEMO_PREFIX.length);
  return urls;
}
