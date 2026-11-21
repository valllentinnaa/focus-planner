// Your wishlist + its private share link, and the public view of someone else's list.
// Visitors never touch the tables: they go through get_shared_wishlist / claim / unclaim, which
// return only what the page needs (the owner never learns who claimed what).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { env } from "@/lib/env";
import { rawDb, supabase } from "@/lib/supabase";
import { useUserId } from "./auth";
import { useItems } from "./items";

export const sharingAvailable = !env.demo;

export function useWishlist() {
  return useItems({ table: "wishlist_items", filters: {}, orderBy: ["position", "created_at"] });
}

export function shareUrl(token: string) {
  const base = env.webUrl || (Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : "");
  return base ? `${base}/w/${token}` : null;
}

export function useWishlistShare() {
  const userId = useUserId();
  const qc = useQueryClient();
  const key = ["wishlist_share", userId];
  const q = useQuery({
    queryKey: key,
    enabled: sharingAvailable && !!userId,
    queryFn: async () => {
      const { data, error } = await rawDb.from("wishlist_shares").select("token").maybeSingle();
      if (error) throw error;
      return (data?.token as string | undefined) ?? null;
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await rawDb.from("wishlist_shares").insert({ user_id: userId }).select("token").single();
      if (error) throw error;
      return data.token as string;
    },
    onSuccess: (token) => qc.setQueryData(key, token),
  });
  const turnOff = useMutation({
    mutationFn: async () => {
      const { error } = await rawDb.from("wishlist_shares").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.setQueryData(key, null),
  });
  return {
    token: q.data ?? null,
    loading: q.isLoading,
    create: () => create.mutate(),
    turnOff: () => turnOff.mutate(),
    busy: create.isPending || turnOff.isPending,
    error: create.error ?? turnOff.error,
  };
}

// ---------- public page ----------
export type SharedItem = { id: string; text: string; link: string | null; note: string; claimed: boolean };
export type SharedWishlist = { owner: string; is_owner: boolean; items: SharedItem[] };

const claimKeyStore = (itemId: string) => `fp.claim.${itemId}`;

/** The random key that proves "I claimed this" — kept only on this device/browser. */
async function claimKeyFor(itemId: string, create: boolean) {
  const stored = await AsyncStorage.getItem(claimKeyStore(itemId));
  if (stored || !create) return stored;
  const key = (Crypto.randomUUID() + Crypto.randomUUID()).replace(/-/g, "");
  await AsyncStorage.setItem(claimKeyStore(itemId), key);
  return key;
}

export function useSharedWishlist(token: string) {
  const qc = useQueryClient();
  const key = ["shared_wishlist", token];
  const q = useQuery({
    queryKey: key,
    enabled: sharingAvailable && !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_shared_wishlist" as never, { p_token: token } as never);
      if (error) throw error;
      const list = data as unknown as SharedWishlist | null;
      if (!list) return null;
      // Which claimed items were claimed from this device.
      const mine = new Set<string>();
      for (const it of list.items) if (it.claimed && (await claimKeyFor(it.id, false))) mine.add(it.id);
      return { ...list, mine };
    },
  });

  const claim = useMutation({
    mutationFn: async (itemId: string) => {
      const k = await claimKeyFor(itemId, true);
      const { data, error } = await supabase.rpc("claim_wishlist_item" as never, { p_token: token, p_item: itemId, p_key: k } as never);
      if (error) throw error;
      if (!data) await AsyncStorage.removeItem(claimKeyStore(itemId)); // someone else was faster
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  const unclaim = useMutation({
    mutationFn: async (itemId: string) => {
      const k = await claimKeyFor(itemId, false);
      if (!k) return;
      const { error } = await supabase.rpc("unclaim_wishlist_item" as never, { p_token: token, p_item: itemId, p_key: k } as never);
      if (error) throw error;
      await AsyncStorage.removeItem(claimKeyStore(itemId));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    list: q.data ?? null,
    loading: q.isLoading,
    error: q.error,
    claim: (id: string) => claim.mutate(id),
    unclaim: (id: string) => unclaim.mutate(id),
    busy: claim.isPending || unclaim.isPending,
  };
}
