// Presents: people (with birthdays) and gift ideas per person. Google Contacts import goes through
// the `google-calendar` edge function, which holds the Google tokens; nothing is stored until the
// user picks which contacts to add.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "@/lib/env";
import type { PickedFile } from "@/lib/pick-file";
import { rawDb, supabase } from "@/lib/supabase";
import { call, calendarAvailable } from "./calendar";
import { newId, useItems } from "./items";
import { useUserId } from "./auth";

export const contactsImportAvailable = calendarAvailable;

export function usePeople() {
  return useItems({ table: "people", filters: {}, orderBy: ["name"] });
}

export function useGiftIdeas() {
  // One query for all ideas: lists are small, and it lets each person show a count.
  return useItems({ table: "gift_ideas", filters: {}, orderBy: ["position", "created_at"] });
}

export type GoogleContact = { id: string; name: string; month: number | null; day: number | null; year: number | null; account: string };
export type ContactsResult = {
  connected: boolean;
  accounts?: string[];
  contacts: GoogleContact[];
  needsAccess: string[];
  errors: { account: string; error: "reconnect" | "failed" | "api_disabled" }[];
};

export const fetchGoogleContacts = () => call<ContactsResult>("contacts");

/** Save the picked contacts as people. Re-importing the same contact is skipped, not duplicated. */
export function useImportContacts() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (picked: GoogleContact[]) => {
      if (!picked.length) return 0;
      const { data: existing, error: e1 } = await rawDb.from("people").select("external_id").eq("source", "google");
      if (e1) throw e1;
      const have = new Set((existing ?? []).map((r: { external_id: string | null }) => r.external_id));
      const rows = picked
        .filter((c) => !have.has(c.id))
        .map((c) => ({ id: newId(), name: c.name, birth_month: c.month, birth_day: c.day, birth_year: c.year, source: "google" as const, external_id: c.id }));
      if (!rows.length) return 0;
      const { error } = await rawDb.from("people").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["people", userId] }),
  });
}

// ---------- files on gift ideas (private bucket, owner-only) ----------
const BUCKET = "gift-files";
export const giftFilesAvailable = !env.demo;

export async function uploadGiftFile(userId: string, file: PickedFile) {
  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const path = `${userId}/${newId()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file.body, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeGiftFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (list.length) await supabase.storage.from(BUCKET).remove(list);
}

/** Short-lived links to view the files (bucket is private). */
export function useGiftFileUrls(paths: string[]) {
  const key = [...paths].sort().join("|");
  const q = useQuery({
    queryKey: ["gift-file-urls", key],
    enabled: giftFilesAvailable && paths.length > 0,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      if (error) throw error;
      return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl as string])) as Record<string, string>;
    },
  });
  return q.data ?? ({} as Record<string, string>);
}
