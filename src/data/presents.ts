// Presents: people (with birthdays) and gift ideas per person. Google Contacts import goes through
// the `google-calendar` edge function, which holds the Google tokens; nothing is stored until the
// user picks which contacts to add.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rawDb } from "@/lib/supabase";
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
