// Share my profile: a personal link/QR. Opening it and tapping Connect links two people directly,
// so they see each other's wishlists (like a two-person circle).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildLink } from "@/lib/links";
import { rawDb, supabase } from "@/lib/supabase";
import { useUserId } from "./auth";
import { circlesAvailable, useCircles } from "./circles";
import { shareBase } from "./wishlist";

const rpc = async <T>(fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as unknown as T;
};

export const profileUrl = (token: string) => buildLink(shareBase(), "u", token);

export function useProfileLink() {
  const userId = useUserId();
  const qc = useQueryClient();
  const key = ["profile_link", userId];
  const q = useQuery({
    queryKey: key,
    enabled: circlesAvailable && !!userId,
    queryFn: async () => {
      const { data, error } = await rawDb.from("profile_links").select("token").maybeSingle();
      if (error) throw error;
      return (data?.token as string | undefined) ?? null;
    },
  });
  const create = useMutation({
    mutationFn: async (fresh: boolean) => {
      if (fresh) {
        const { error } = await rawDb.from("profile_links").delete().eq("user_id", userId);
        if (error) throw error;
      }
      const { data, error } = await rawDb.from("profile_links").insert({ user_id: userId }).select("token").single();
      if (error) throw error;
      return data.token as string;
    },
    onSuccess: (token) => qc.setQueryData(key, token),
  });
  return {
    token: q.data ?? null,
    loading: q.isLoading,
    create: () => create.mutate(false),
    /** The link's token, making the link first if there isn't one yet. */
    ensure: async () => q.data ?? (await create.mutateAsync(false)),
    reset: () => create.mutate(true),
    busy: create.isPending,
  };
}

export type Connection = { user_id: string; name: string };

export function useConnections() {
  const userId = useUserId();
  const qc = useQueryClient();
  const key = ["connections", userId];
  const q = useQuery({ queryKey: key, enabled: circlesAvailable && !!userId, queryFn: () => rpc<Connection[]>("my_connections") });
  const remove = useMutation({
    mutationFn: async (other: string) => {
      const [a, b] = [userId!, other].sort();
      const { error } = await rawDb.from("connections").delete().eq("user_a", a).eq("user_b", b);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { connections: q.data ?? [], loading: q.isLoading, remove: (id: string) => remove.mutate(id) };
}

/** Everyone whose wishlist you can see: connections + circle-mates, once each. */
export function useMates() {
  const { mates } = useCircles();
  const { connections } = useConnections();
  const all = new Map<string, string>();
  for (const c of connections) all.set(c.user_id, c.name);
  for (const m of mates) if (!all.has(m.user_id)) all.set(m.user_id, m.name);
  return [...all].map(([user_id, name]) => ({ user_id, name }));
}

export const profilePreview = (token: string) => rpc<{ name: string; is_me: boolean | null; connected: boolean } | null>("profile_preview", { p_token: token });
export const connectWith = (token: string) => rpc<boolean>("connect_with", { p_token: token });
