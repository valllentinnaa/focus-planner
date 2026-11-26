// Your own birthday (on your profile) and your friends' birthdays (through mate_birthdays()).
// A People entry linked to a friend shows the friend's birthday live unless you typed one yourself.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "@/lib/env";
import { rawDb, supabase } from "@/lib/supabase";
import { useUserId } from "./auth";

export type MyBirthday = {
  month: number | null;
  day: number | null;
  year: number | null;
  shareYear: boolean;
  dismissed: string[];
};

export type Prompt = "presents" | "wishlist";

export function useMyBirthday() {
  const userId = useUserId();
  const qc = useQueryClient();
  const key = ["my-birthday", userId];
  const q = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async (): Promise<MyBirthday> => {
      const { data, error } = await rawDb
        .from("profiles")
        .select("birth_month, birth_day, birth_year, share_birth_year, dismissed_prompts")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return {
        month: data?.birth_month ?? null,
        day: data?.birth_day ?? null,
        year: data?.birth_year ?? null,
        shareYear: !!data?.share_birth_year,
        dismissed: (data?.dismissed_prompts as string[] | undefined) ?? [],
      };
    },
  });
  const save = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await rawDb.from("profiles").update(row).eq("id", userId);
      if (error) throw error;
    },
    onMutate: (row) =>
      qc.setQueryData<MyBirthday>(key, (cur) =>
        cur && {
          month: "birth_month" in row ? (row.birth_month as number | null) : cur.month,
          day: "birth_day" in row ? (row.birth_day as number | null) : cur.day,
          year: "birth_year" in row ? (row.birth_year as number | null) : cur.year,
          shareYear: "share_birth_year" in row ? !!row.share_birth_year : cur.shareYear,
          dismissed: "dismissed_prompts" in row ? (row.dismissed_prompts as string[]) : cur.dismissed,
        },
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  const b = q.data;
  return {
    birthday: b ?? null,
    loading: q.isLoading,
    error: save.error,
    setBirthday: (v: { month: number; day: number; year: number | null } | null) =>
      save.mutate({ birth_month: v?.month ?? null, birth_day: v?.day ?? null, birth_year: v?.year ?? null }),
    setShareYear: (shareYear: boolean) => save.mutate({ share_birth_year: shareYear }),
    dismiss: (p: Prompt) => b && !b.dismissed.includes(p) && save.mutate({ dismissed_prompts: [...b.dismissed, p] }),
  };
}

export type MateBirthday = { month: number; day: number; year: number | null };

/** user_id → birthday, for everyone you share wishlists with. */
export function useMateBirthdays() {
  const userId = useUserId();
  const q = useQuery({
    queryKey: ["mate-birthdays", userId],
    enabled: !env.demo && !!userId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("mate_birthdays" as never);
      if (error) throw error;
      const map = new Map<string, MateBirthday>();
      for (const r of (data ?? []) as { user_id: string; birth_month: number; birth_day: number; birth_year: number | null }[])
        map.set(r.user_id, { month: r.birth_month, day: r.birth_day, year: r.birth_year });
      return map;
    },
  });
  return q.data ?? NO_MATES;
}
const NO_MATES = new Map<string, MateBirthday>();

type PersonLike = { linked_user_id?: string | null; birth_month: number | null; birth_day: number | null; birth_year: number | null };

/** A person's birthday: what you typed, else their own (if they're a friend on the app). */
export function withFriendBirthday<T extends PersonLike>(p: T, mates: Map<string, MateBirthday>): T & { birthdayFromFriend: boolean } {
  if (p.birth_month || !p.linked_user_id) return { ...p, birthdayFromFriend: false };
  const m = mates.get(p.linked_user_id);
  if (!m) return { ...p, birthdayFromFriend: false };
  return { ...p, birth_month: m.month, birth_day: m.day, birth_year: m.year, birthdayFromFriend: true };
}
