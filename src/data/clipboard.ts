// Clipboard (quick dump). Giving a line a date moves it into the planner as a task on that day.
import { useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { taskFromClipboard } from "@/lib/clipboard";
import { rawDb } from "@/lib/supabase";
import { useItems } from "./items";

export function useClipboard() {
  const list = useItems({ table: "clipboard_items", filters: {}, orderBy: ["position", "created_at"] });
  const qc = useQueryClient();

  /** Create the task first; only once it's saved, take the line off the clipboard. */
  const moveToDay = async (id: string, text: string, iso: string) => {
    const { error } = await rawDb.from("tasks").insert({ id: Crypto.randomUUID(), ...taskFromClipboard(text, iso) });
    if (error) throw error;
    list.remove(id);
    await qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return { ...list, moveToDay };
}
