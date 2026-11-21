// Circles: small groups of app users who see each other's wishlists. Everything that crosses
// between users goes through database functions (my_circles, circle_wishlist, …) that return only
// what the screen needs; claims are never visible to the list's owner.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "@/lib/env";
import { rawDb, supabase } from "@/lib/supabase";
import { useUserId } from "./auth";
import { newId } from "./items";
import { shareBase } from "./wishlist";

export const circlesAvailable = !env.demo;

export type CircleMember = { user_id: string; name: string; is_me: boolean; is_owner: boolean };
export type Circle = { id: string; name: string; is_owner: boolean; invite_token: string | null; members: CircleMember[] };

const rpc = async <T>(fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as unknown as T;
};

export const inviteUrl = (token: string) => {
  const base = shareBase();
  return base ? `${base}/join/${token}` : null;
};

export function useCircles() {
  const userId = useUserId();
  const qc = useQueryClient();
  const key = ["circles", userId];
  const q = useQuery({ queryKey: key, enabled: circlesAvailable && !!userId, queryFn: () => rpc<Circle[]>("my_circles") });
  const run = <A,>(fn: (a: A) => Promise<unknown>) => ({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: key }) });

  const create = useMutation(run(async (name: string) => {
    const { error } = await rawDb.from("circles").insert({ id: newId(), name: name.trim().slice(0, 60) });
    if (error) throw error;
  }));
  const rename = useMutation(run(async ({ id, name }: { id: string; name: string }) => {
    const { error } = await rawDb.from("circles").update({ name: name.trim().slice(0, 60) }).eq("id", id);
    if (error) throw error;
  }));
  const remove = useMutation(run(async (id: string) => {
    const { error } = await rawDb.from("circles").delete().eq("id", id);
    if (error) throw error;
  }));
  const leave = useMutation(run(async (circleId: string) => {
    const { error } = await rawDb.from("circle_members").delete().eq("circle_id", circleId).eq("user_id", userId);
    if (error) throw error;
  }));
  const removeMember = useMutation(run(async ({ circleId, memberId }: { circleId: string; memberId: string }) => {
    const { error } = await rawDb.from("circle_members").delete().eq("circle_id", circleId).eq("user_id", memberId);
    if (error) throw error;
  }));
  const resetInvite = useMutation(run((circleId: string) => rpc<string>("reset_circle_invite", { p_circle: circleId })));

  const circles = q.data ?? [];
  // Everyone you share a circle with (deduplicated), for linking contacts.
  const mates = new Map<string, string>();
  for (const c of circles) for (const m of c.members) if (!m.is_me) mates.set(m.user_id, m.name);

  return {
    circles,
    mates: [...mates].map(([user_id, name]) => ({ user_id, name })),
    loading: q.isLoading,
    error: q.error,
    create: (name: string) => create.mutate(name),
    rename: (id: string, name: string) => rename.mutate({ id, name }),
    remove: (id: string) => remove.mutate(id),
    leave: (id: string) => leave.mutate(id),
    removeMember: (circleId: string, memberId: string) => removeMember.mutate({ circleId, memberId }),
    resetInvite: (id: string) => resetInvite.mutate(id),
  };
}

export type MateItem = { id: string; text: string; link: string | null; note: string; claimed: boolean; mine: boolean };

export function useMateWishlist(mateId: string | null) {
  const qc = useQueryClient();
  const key = ["mate-wishlist", mateId];
  const q = useQuery({
    queryKey: key,
    enabled: circlesAvailable && !!mateId,
    queryFn: () => rpc<{ name: string; items: MateItem[] } | null>("circle_wishlist", { p_user: mateId }),
  });
  const claim = useMutation({ mutationFn: (item: string) => rpc<boolean>("circle_claim", { p_item: item }), onSettled: () => qc.invalidateQueries({ queryKey: key }) });
  const unclaim = useMutation({ mutationFn: (item: string) => rpc<boolean>("circle_unclaim", { p_item: item }), onSettled: () => qc.invalidateQueries({ queryKey: key }) });
  return {
    list: q.data ?? null,
    loading: q.isLoading,
    claim: (id: string) => claim.mutate(id),
    unclaim: (id: string) => unclaim.mutate(id),
    busy: claim.isPending || unclaim.isPending,
  };
}

// ---------- joining by invite link ----------
// A link opened while signed out (circle invite or profile link) is remembered and reopened after sign-in.
const PENDING = "fp.pendingLink";
export const savePendingLink = (path: `/join/${string}` | `/u/${string}`) => AsyncStorage.setItem(PENDING, path);
export async function takePendingLink() {
  const p = await AsyncStorage.getItem(PENDING);
  if (p) await AsyncStorage.removeItem(PENDING);
  return p && /^\/(join|u)\/[0-9a-f]{32}$/.test(p) ? (p as `/join/${string}` | `/u/${string}`) : null;
}
export const circlePreview = (token: string) =>
  rpc<{ name: string; owner: string; members: number; already: boolean } | null>("circle_preview", { p_token: token });
export const joinCircle = (token: string) => rpc<string | null>("join_circle", { p_token: token });
